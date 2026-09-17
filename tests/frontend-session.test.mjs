import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const flush = () => new Promise(resolve => setImmediate(resolve))
const result = await build({
  stdin: { contents: `export { default as http } from './src/utils/http'; export { useUserStore as user } from './src/store/modules/useUserStore'; export { useMenuStore as menus } from './src/store/modules/useMenuStore'; export { useRouteStore as routes } from './src/store/modules/useRouteStore'`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'import.meta.env': '{"VITE_APP_STORAGE_PREFIX":"test_"}' },
  plugins: [{ name: 'session-dependencies', setup(builder) {
    builder.onResolve({ filter: /^@\/provider\/(plugins|settings)$/ }, args => ({ path: args.path, namespace: 'double' }))
    builder.onLoad({ filter: /.*/, namespace: 'double' }, args => ({ contents: args.path.endsWith('plugins')
      ? `export const usePluginStore = { getState: () => ({ callHooks: async () => {} }) }`
      : `export const getPersistedPrimaryColor = () => null; export const useSettingStore = { getState: () => ({ settings: { app: {} }, setSettings() {} }) }` }))
  } }],
})
function harness() {
  const values = new Map()
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }
  globalThis.localStorage = storage
  globalThis.window = { localStorage: storage }
  const module = { exports: {} }
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
  const h = module.exports
  h.requests = []
  h.http.defaults.adapter = config => new Promise((resolve, reject) => {
    h.requests.push({ config, ok: data => resolve({ config, status: 200, statusText: 'OK', headers: {}, data }), fail: status => reject({ config, response: { config, status, data: { code: status, message: '模拟失败' } } }) })
  })
  h.login = name => h.user.getState().loginWithTokens({ access_token: name, refresh_token: `refresh-${name}`, expire_at: 100 }, { username: name })
  h.take = part => { const index = h.requests.findIndex(r => r.config.url.includes(part)); assert.ok(index >= 0, `应产生 ${part} 请求`); return h.requests.splice(index, 1)[0] }
  return h
}
const tokens = name => ({ data: { access_token: name, refresh_token: `refresh-${name}`, expire_at: 100 } })

test('并发业务/HTTP 401 共享刷新，迟到 401 复用新令牌且最多重试一次', async () => {
  const h = harness(); await h.login('A')
  const calls = ['/a', '/b', '/late'].map(url => h.http.get(url).then(() => true, () => false))
  await flush()
  h.take('/a').ok({ code: 401 }); h.take('/b').fail(401)
  await flush(); assert.equal(h.requests.filter(r => r.config.url.includes('/refresh')).length, 1)
  h.take('/refresh').ok(tokens('A-new')); await flush()
  const a = h.take('/a'); assert.equal(a.config.headers.Authorization, 'Bearer A-new'); a.ok({ code: 200 })
  // Resolve b, late arrival should reuse A-new without another refresh.
  h.take('/b').ok({ code: 200 }); h.take('/late').ok({ code: 401 }); await flush()
  const late = h.take('/late'); assert.equal(late.config.headers.Authorization, 'Bearer A-new'); late.ok({ code: 200 })
  assert.equal(h.requests.length, 0)
  // A separate request checks the retry limit.
  const limited = h.http.get('/limit').catch(error => error)
  await flush(); h.take('/limit').fail(401); await flush(); h.take('/refresh').ok(tokens('A-newer')); await flush(); h.take('/limit').fail(401)
  assert.equal((await limited).code, 401); assert.equal(h.requests.length, 0)
  assert.deepEqual(await Promise.all(calls), [true, true, true])
})

test('账号切换后旧业务成功/401 不回写、不刷新、不借用新账号令牌', async () => {
  const h = harness(); await h.login('A')
  const success = h.http.get('/old-success').catch(error => error)
  const failed = h.http.get('/old-error').catch(error => error)
  await flush(); await h.login('B')
  h.take('/old-success').ok({ code: 200 }); h.take('/old-error').fail(401)
  assert.equal((await success).code, 'ERR_CANCELED'); await failed
  assert.equal(h.requests.length, 0); assert.equal(h.user.getState().token, 'B')
})

test('旧账号刷新失败不能清除新账号，新账号有独立刷新任务', async () => {
  const h = harness(); await h.login('A')
  const old = h.user.getState().refreshToken(); await flush(); const first = h.take('/refresh')
  await h.login('B'); const current = h.user.getState().refreshToken(); await flush(); const second = h.take('/refresh')
  first.fail(401); assert.equal(await old, false); assert.equal(h.user.getState().token, 'B')
  second.ok(tokens('B-new')); assert.equal(await current, true); assert.equal(h.user.getState().token, 'B-new')
})

test('临时刷新失败保留会话，凭据失效清空会话和 loading', async () => {
  const h = harness(); await h.login('A')
  const transient = h.user.getState().refreshToken(); await flush(); h.take('/refresh').fail(503)
  assert.equal(await transient, false); assert.equal(h.user.getState().token, 'A')
  h.user.setState({ loading: true })
  const denied = h.user.getState().refreshToken(); await flush(); h.take('/refresh').fail(401)
  assert.equal(await denied, false); assert.equal(h.user.getState().token, null); assert.equal(h.user.getState().loading, false)
})

test('退出同步清空本地状态，退出和刷新迟到不会清除/复活新会话', async () => {
  const h = harness(); await h.login('A')
  const refresh = h.user.getState().refreshToken(); await flush(); const pending = h.take('/refresh')
  const logout = h.user.getState().logout(); assert.equal(h.user.getState().token, null)
  await h.login('B'); await flush(); const request = h.take('/logout')
  assert.equal(request.config.headers.Authorization, 'Bearer A')
  request.fail(401); pending.ok(tokens('A-late')); await logout; assert.equal(await refresh, false)
  assert.equal(h.user.getState().token, 'B'); assert.equal(h.requests.length, 0)
})

test('初始化中账号切换：旧 getInfo、菜单响应均不能回填', async () => {
  for (const stage of ['info', 'menus']) {
    const h = harness(); await h.login('A')
    const hydrate = h.user.getState().hydrate(); await flush()
    const info = h.take('/getInfo')
    let pending = info
    if (stage === 'menus') { info.ok({ data: { username: 'A' } }); await flush(); pending = h.requests.shift(); assert.ok(pending) }
    await h.login('B'); pending.ok({ data: stage === 'info' ? { username: 'A' } : [{ name: 'old', path: '/old' }] })
    assert.equal(await hydrate, false); assert.equal(h.user.getState().userInfo.username, 'B')
    assert.equal(h.user.getState().loading, false); assert.deepEqual(h.menus.getState().menus, []); assert.deepEqual(h.routes.getState().flattened, [])
  }
})

test('菜单失败保留失败状态并支持显式重试，角色失败也不能进入业务页', async () => {
  const h = harness(); await h.login('A')
  const first = h.user.getState().hydrate(); await flush(); h.take('/getInfo').ok({ data: { username: 'A' } }); await flush(); h.requests.shift().fail(500)
  assert.equal(await first, false); assert.equal(h.user.getState().initialized, false); assert.ok(h.user.getState().error)
  const retry = h.user.getState().hydrate(); await flush(); h.take('/getInfo').ok({ data: { username: 'A' } }); await flush(); h.requests.shift().ok({ data: [] }); await flush(); h.requests.shift().ok({ data: [] })
  assert.equal(await retry, true); assert.equal(h.user.getState().initialized, true)
  const roleFail = h.user.getState().hydrate(); await flush(); h.take('/getInfo').ok({ data: { username: 'A' } }); await flush(); h.requests.shift().ok({ data: [] }); await flush(); h.requests.shift().fail(500)
  assert.equal(await roleFail, false); assert.equal(h.menus.getState().initialized, false)
})

test('显式 Authorization 不触发后台会话刷新', async () => {
  const h = harness(); await h.login('A')
  const request = h.http.get('/explicit', { headers: { Authorization: 'Bearer custom' } }).catch(error => error)
  await flush(); h.take('/explicit').fail(401); await request; assert.equal(h.requests.length, 0)
})

test('取消登录后迟到响应不能复活会话，缺少刷新凭据会退出', async () => {
  const h = harness()
  const login = h.user.getState().login({ username: 'A', password: 'synthetic' }).catch(error => error)
  await flush(); const pending = h.take('/login')
  await h.user.getState().logout(); pending.ok(tokens('A'))
  assert.match((await login).message, /登录已取消/); assert.equal(h.user.getState().token, null)
  await h.login('B'); localStorage.removeItem('test_refresh_token')
  assert.equal(await h.user.getState().refreshToken(), false); assert.equal(h.user.getState().token, null)
})
