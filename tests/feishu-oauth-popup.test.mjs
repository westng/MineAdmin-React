import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { setImmediate as tick } from 'node:timers/promises'
import { fileURLToPath, URL } from 'node:url'
import { build } from 'esbuild'

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/modules/feishu/login/views/data/oauth-popup.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
})
const loaded = { exports: {} }
new Function('module', 'exports', 'require', compiled.outputFiles[0].text)(
  loaded,
  loaded.exports,
  createRequire(import.meta.url),
)
const { startFeishuOAuth, postFeishuTicketToOpener, FEISHU_OAUTH_MESSAGE_TYPE } = loaded.exports
const ticket = 'a'.repeat(64)

function fixture(t, { blocked = false } = {}) {
  const prior = globalThis.window
  const listeners = new Set()
  const intervals = new Map()
  const timeouts = new Map()
  const calls = []
  let nextId = 0
  const popup = {
    closed: false,
    location: { href: '' },
    focus() {},
    close() {
      this.closed = true
    },
  }
  globalThis.window = {
    location: { origin: 'https://biotech.example.com' },
    opener: null,
    open() {
      calls.push('open')
      return blocked ? null : popup
    },
    addEventListener(type, listener) {
      if (type === 'message') listeners.add(listener)
    },
    removeEventListener(type, listener) {
      if (type === 'message') listeners.delete(listener)
    },
    setInterval(callback) {
      intervals.set(++nextId, callback)
      return nextId
    },
    clearInterval(id) {
      intervals.delete(id)
    },
    setTimeout(callback) {
      timeouts.set(++nextId, callback)
      return nextId
    },
    clearTimeout(id) {
      timeouts.delete(id)
    },
  }
  t.after(() => {
    globalThis.window = prior
  })
  const results = []
  const errors = []
  const options = {
    authorize: async signal => {
      calls.push(['authorize', signal])
      return { url: 'https://accounts.feishu.cn/authorize' }
    },
    exchange: async (value, signal) => {
      calls.push(['exchange', value, signal])
      return { result_code: 'FEISHU_BIND_SUCCESS' }
    },
    onResult: async value => {
      results.push(value)
    },
    onError: error => {
      errors.push(error)
    },
    onClosed: () => {
      calls.push('closed')
    },
  }
  const message = (overrides = {}) => {
    const event = {
      origin: globalThis.window.location.origin,
      source: popup,
      data: { type: FEISHU_OAUTH_MESSAGE_TYPE, ticket },
      ...overrides,
    }
    for (const listener of listeners) listener(event)
  }
  return { popup, calls, results, errors, options, message, listeners, intervals, timeouts }
}

test('授权窗口在请求前同步打开，回调发送方和接收方使用同一契约并只交换一次', async t => {
  const f = fixture(t)
  startFeishuOAuth(f.options)
  assert.equal(f.calls[0], 'open')
  assert.equal(f.calls[1][0], 'authorize')
  await tick()
  assert.equal(f.popup.location.href, 'https://accounts.feishu.cn/authorize')
  globalThis.window.opener = { postMessage: (data, origin) => f.message({ data, origin }) }
  assert.equal(postFeishuTicketToOpener(ticket), true)
  f.message()
  await tick()
  assert.equal(f.calls.filter(call => call[0] === 'exchange').length, 1)
  assert.deepEqual(f.results, [{ result_code: 'FEISHU_BIND_SUCCESS' }])
  assert.equal(f.popup.closed, true)
  assert.equal(f.listeners.size + f.intervals.size + f.timeouts.size, 0)
})

test('错误来源、外部窗口、旧消息标识和非法票据不能触发交换', async t => {
  const f = fixture(t)
  const task = startFeishuOAuth(f.options)
  f.message({ origin: 'https://another.example.com' })
  f.message({ source: {} })
  f.message({ data: { type: 'rally-feishu-login-ticket', ticket } })
  f.message({ data: { type: FEISHU_OAUTH_MESSAGE_TYPE, ticket: 'bad' } })
  f.message({ data: null })
  await tick()
  assert.equal(f.calls.filter(call => call[0] === 'exchange').length, 0)
  task.dispose()
})

test('弹窗被阻止时不申请授权，显示可操作提示', t => {
  const f = fixture(t, { blocked: true })
  assert.equal(startFeishuOAuth(f.options), null)
  assert.deepEqual(f.calls, ['open'])
  assert.match(f.errors[0].message, /允许本站打开/)
})

test('用户关闭窗口会中止请求，迟到的授权响应不会再次导航', async t => {
  const f = fixture(t)
  let resolve
  let signal
  startFeishuOAuth({
    ...f.options,
    authorize: currentSignal => {
      signal = currentSignal
      return new Promise(done => {
        resolve = done
      })
    },
  })
  f.popup.closed = true
  for (const callback of [...f.intervals.values()]) callback()
  resolve({ url: 'https://accounts.feishu.cn/late' })
  await tick()
  assert.equal(signal.aborted, true)
  assert.equal(f.popup.location.href, '')
  assert.equal(f.calls.filter(call => call === 'closed').length, 1)
})

test('超时会清理消息监听和两个计时器', t => {
  const f = fixture(t)
  startFeishuOAuth({ ...f.options, authorize: () => new Promise(() => {}) })
  for (const callback of [...f.timeouts.values()]) callback()
  assert.match(f.errors[0].message, /超时/)
  assert.equal(f.listeners.size + f.intervals.size + f.timeouts.size, 0)
  assert.equal(f.popup.closed, true)
})

test('交换失败仍释放窗口和操作锁，卸载后不再交付结果', async t => {
  const f = fixture(t)
  startFeishuOAuth({
    ...f.options,
    exchange: async () => {
      throw new Error('交换失败')
    },
  })
  f.message()
  await tick()
  assert.equal(f.errors[0].message, '交换失败')
  assert.equal(f.calls.filter(call => call === 'closed').length, 1)
  let resolve
  const task = startFeishuOAuth({
    ...f.options,
    exchange: () =>
      new Promise(done => {
        resolve = done
      }),
  })
  f.message()
  task.dispose()
  resolve({ result_code: 'FEISHU_LOGIN_SUCCESS' })
  await tick()
  assert.deepEqual(f.results, [])
})

test('非法授权协议和非法票据不进入授权流程', async t => {
  const f = fixture(t)
  startFeishuOAuth({ ...f.options, authorize: async () => ({ url: 'javascript:void(0)' }) })
  await tick()
  assert.match(f.errors[0].message, /授权地址无效/)
  assert.equal(f.popup.location.href, '')
  assert.equal(postFeishuTicketToOpener('invalid'), false)
  assert.equal(postFeishuTicketToOpener(ticket), false)
})
