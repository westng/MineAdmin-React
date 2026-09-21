import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import process from 'node:process'
import { setImmediate } from 'node:timers'
import { build } from 'esbuild'

async function harness() {
  const result = await build({
    stdin: {
      contents: `export * from './src/modules/notification/store/inbox-toast-monitor'; export { useInboxStore, update } from './src/modules/notification/store/inbox-store'; export { requests } from './src/modules/notification/api'; export { shown, dismissed } from '@/components/reui/use-toast'`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    plugins: [
      {
        name: 'notification-toast-doubles',
        setup(builder) {
          builder.onResolve({ filter: /(?:inbox-store|notification\/api|^\.\.\/api|reui\/use-toast)$/ }, args => ({
            path: args.path.endsWith('inbox-store')
              ? 'inbox-store'
              : args.path.endsWith('use-toast')
                ? 'use-toast'
                : 'api',
            namespace: 'double',
          }))
          builder.onLoad({ filter: /.*/, namespace: 'double' }, args => ({
            loader: 'js',
            contents: args.path.endsWith('inbox-store')
              ? `let state = { accountId: 1, epoch: 0, enabled: true, blocked: false, revision: 1, count: 1 }; const listeners = new Set(); export const useInboxStore = { getState: () => state, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) } }; export function update(patch = {}) { const previous = state; state = { ...state, revision: state.revision + 1, ...patch }; listeners.forEach(fn => fn(state, previous)); }`
              : args.path === 'api'
                ? `export const requests = []; export const notificationApi = { list: (params, signal) => new Promise((resolve, reject) => requests.push({ params, signal, resolve: list => resolve({ list, total: list.length }), reject })) };`
                : `export const shown = []; export const dismissed = []; export const toast = { info: (title, options) => { shown.push({ title, ...options }); return options.id }, dismiss: id => dismissed.push(id) };`,
          }))
        },
      },
    ],
  })
  const module = { exports: {} }
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(
    module,
    module.exports,
    createRequire(import.meta.url),
  )
  const h = module.exports
  let active = true
  const paths = []
  const stop = h.startInboxToastMonitor({ isActive: () => active, navigate: path => paths.push(path) })
  return {
    ...h,
    stop,
    paths,
    setActive: value => {
      active = value
    },
  }
}

const flush = () => new Promise(resolve => setImmediate(resolve))
const item = (id, time, extra = {}) => ({
  receipt_id: String(id),
  delivered_at: `2026-09-08T10:00:${time}Z`,
  read_at: null,
  content_state: 'available',
  title: `通知 ${id}`,
  summary: `摘要 ${id}`,
  category: 'business',
  priority: 'normal',
  expires_at: null,
  ...extra,
})
const respond = async (h, items) => {
  assert.ok(h.requests.length, 'expected a notification list request')
  h.requests.shift().resolve(items)
  await flush()
}

test('initial history is silent; a new receipt alerts even when the unread count stays equal', async () => {
  const h = await harness()
  await respond(h, [item(1, '01')])
  assert.equal(h.shown.length, 0)
  h.update({ count: 1 })
  await respond(h, [item(2, '02'), item(1, '01', { read_at: '2026-09-08T10:00:02Z' })])
  assert.equal(h.shown.length, 1)
  assert.equal(h.shown[0].title, '通知 2')
  assert.equal(h.shown[0].description, '摘要 2')
  h.shown[0].action.onClick()
  assert.deepEqual(h.paths, ['/notifications/2'])
  h.update()
  await respond(h, [item(2, '02')])
  assert.equal(h.shown.length, 1, 'repeated refresh must not alert again')
  h.stop()
})

test('empty inbox can receive an arrival; a batch uses one toast and opens the inbox', async () => {
  const h = await harness()
  await respond(h, [])
  h.update()
  await respond(h, [item(3, '03'), item(2, '02'), item(1, '01')])
  assert.equal(h.shown.length, 1)
  assert.equal(h.shown[0].title, '收到多条新通知')
  assert.equal(h.shown[0].description, '最新：通知 3')
  h.shown[0].action.onClick()
  assert.deepEqual(h.paths, ['/notifications'])
  h.stop()
})

test('same-second deliveries and delayed lower receipt IDs are new, resurfaced history is not', async () => {
  const h = await harness()
  await respond(h, [item(100, '10')])
  h.update()
  await respond(h, [item(100, '10'), item(99, '10'), item(1, '01')])
  assert.equal(h.shown.length, 1)
  assert.equal(h.shown[0].title, '通知 99')
  h.update()
  await respond(h, [item(2, '11'), item(100, '10'), item(99, '10')])
  assert.equal(h.shown.length, 2)
  assert.equal(h.shown[1].title, '通知 2')
  h.update()
  await respond(h, [item(1, '01')])
  assert.equal(h.shown.length, 2)
  h.stop()
})

test('read, revoked, expired and inaccessible notifications do not alert or reappear on access changes', async () => {
  const h = await harness()
  await respond(h, [])
  const unavailable = item(4, '04', { content_state: 'unavailable' })
  h.update()
  await respond(h, [
    unavailable,
    item(3, '03', { content_state: 'expired' }),
    item(2, '02', { content_state: 'revoked' }),
    item(1, '01', { read_at: '2026-09-08T10:00:02Z' }),
  ])
  assert.equal(h.shown.length, 0)
  h.update()
  await respond(h, [item(4, '04')])
  assert.equal(h.shown.length, 0)
  h.stop()
})

test('network failure keeps the cursor; concurrent refreshes deduplicate and hidden replies wait for foreground', async () => {
  const h = await harness()
  await respond(h, [item(1, '01')])
  h.update()
  h.update()
  assert.equal(h.requests.length, 1)
  h.requests.shift().reject(new Error('offline'))
  await flush()
  h.update()
  h.setActive(false)
  await respond(h, [item(2, '02')])
  assert.equal(h.shown.length, 0)
  h.update()
  assert.equal(h.requests.length, 0)
  h.setActive(true)
  h.update()
  await respond(h, [item(2, '02')])
  assert.equal(h.shown.length, 1)
  h.stop()
})

test('account switch dismisses old toasts immediately and ignores their actions and late replies', async () => {
  const h = await harness()
  await respond(h, [])
  h.update()
  await respond(h, [item(1, '01')])
  h.update()
  const late = h.requests.shift()
  h.update({ accountId: 2, epoch: 1 })
  assert.equal(late.signal.aborted, true)
  assert.ok(h.dismissed.includes(h.shown[0].id))
  late.resolve([item(2, '02')])
  await flush()
  assert.equal(h.shown.length, 1)
  h.shown[0].action.onClick()
  assert.deepEqual(h.paths, [])
  h.stop()
})

test('read or revoked content dismisses its toast; disabling notifications clears and rebaselines', async () => {
  const h = await harness()
  await respond(h, [])
  h.update()
  await respond(h, [item(1, '01')])
  h.update()
  await respond(h, [item(1, '01', { content_state: 'revoked' })])
  assert.ok(h.dismissed.includes(h.shown[0].id))
  h.update({ enabled: false })
  assert.equal(h.requests.length, 0)
  h.update({ enabled: true })
  await respond(h, [item(2, '02')])
  assert.equal(h.shown.length, 1, 're-enabling must not announce history')
  h.stop()
})

test('cleanup and an invalid login abort pending responses without creating reminders', async () => {
  for (const invalidate of [h => h.stop(), h => h.update({ blocked: true, epoch: 1, enabled: false })]) {
    const h = await harness()
    await respond(h, [])
    h.update()
    const late = h.requests.shift()
    invalidate(h)
    assert.equal(late.signal.aborted, true)
    late.resolve([item(1, '01')])
    await flush()
    assert.equal(h.shown.length, 0)
    h.stop()
  }
})
