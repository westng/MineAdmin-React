import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import process from 'node:process'
import { setImmediate } from 'node:timers'
import { build } from 'esbuild'

// Bundle only the notification state module; HTTP and account identity are controlled test doubles.
// The HTTP double deliberately ignores cancellation to exercise late replies from a previous account.
async function harness() {
  const result = await build({
    stdin: {
      contents: `export * from './src/modules/notification/store/inbox-store'; export { notificationApi } from './src/modules/notification/api'; export { requests } from '@/provider/http'; export { switchAccount } from '@/provider/session'`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['zustand'],
    plugins: [
      {
        name: 'notification-doubles',
        setup(builder) {
          builder.onResolve({ filter: /^@\/(provider\/http|provider\/session)$/ }, args => ({
            path: args.path,
            namespace: 'notification-double',
          }))
          builder.onLoad({ filter: /.*/, namespace: 'notification-double' }, args => ({
            loader: 'js',
            contents: args.path.endsWith('http')
              ? `export const requests = []; const request = (url, ...args) => new Promise((resolve, reject) => requests.push({ url, args, resolve: data => resolve({ data: { data } }), reject })); export default { get: request, post: request, put: request, patch: request, delete: request };`
              : `let state = { token: 'token-1', userInfo: { id: 1 } }; const listeners = new Set(); export const useSessionStore = { getState: () => state, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) } }; export function switchAccount(id) { state = { token: id ? 'token-' + id : null, userInfo: id ? { id } : null }; listeners.forEach(fn => fn()); }`,
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
  return module.exports
}
const flush = () => new Promise(resolve => setImmediate(resolve))

test('shared refresh deduplicates requests and still revises visible content when count stays equal', async () => {
  const h = await harness()
  const first = h.refreshInbox()
  assert.equal(h.refreshInbox(), first)
  assert.equal(h.requests.length, 1)
  h.requests.shift().resolve({ enabled: true })
  await flush()
  h.requests.shift().resolve({ total: 2 })
  await first
  const revision = h.useInboxStore.getState().revision
  const second = h.refreshInbox()
  h.requests.shift().resolve({ enabled: true })
  await flush()
  h.requests.shift().resolve({ total: 2 })
  await second
  assert.equal(h.useInboxStore.getState().count, 2)
  assert.equal(h.useInboxStore.getState().revision, revision + 1)
})

test('account switch clears state immediately and ignores late previous-account count', async () => {
  const h = await harness()
  const old = h.refreshInbox()
  h.requests.shift().resolve({ enabled: true })
  await flush()
  const oldCount = h.requests.shift()
  h.useInboxStore.setState({ count: 8, readAllKey: 'old-key' })
  h.switchAccount(2)
  assert.equal(h.useInboxStore.getState().count, null)
  assert.equal(h.useInboxStore.getState().readAllKey, null)
  const fresh = h.refreshInbox()
  h.requests.shift().resolve({ enabled: true })
  await flush()
  h.requests.shift().resolve({ total: 3 })
  await fresh
  oldCount.resolve({ total: 99 })
  await old
  assert.equal(h.useInboxStore.getState().accountId, 2)
  assert.equal(h.useInboxStore.getState().count, 3)
})

test('ordinary outage retains last result, final unauthorized response clears and blocks it', async () => {
  const h = await harness()
  h.useInboxStore.setState({ enabled: true, count: 8 })
  const outage = h.refreshInbox()
  h.requests.shift().reject({ code: 503, message: 'offline' })
  await outage
  assert.equal(h.useInboxStore.getState().count, 8)
  assert.equal(h.useInboxStore.getState().error, 'offline')
  const invalid = h.notificationApi.detail('1')
  h.requests.shift().reject({ code: 401, message: 'disabled account' })
  await assert.rejects(invalid)
  assert.equal(h.useInboxStore.getState().count, null)
  assert.equal(h.useInboxStore.getState().blocked, true)
  assert.equal(await h.refreshInbox(), false)
  assert.equal(h.requests.length, 0)
})

test('late unauthorized response cannot block the newly signed-in account', async () => {
  const h = await harness()
  const old = h.notificationApi.detail('1')
  const request = h.requests.shift()
  h.switchAccount(2)
  request.reject({ code: 401, message: 'expired' })
  await assert.rejects(old)
  assert.equal(h.useInboxStore.getState().blocked, false)
  assert.equal(h.useInboxStore.getState().accountId, 2)
})
