import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const result = await build({
  stdin: {
    contents: `
      export { createAppRuntime } from './src/app/runtime/create-runtime'
      export { createSessionManager } from './src/services/auth/session-manager'
      export { createHttpClient } from './src/services/http/client'
      export { createPluginHost } from './src/provider/plugins/host'
      export { createApi as createUserApi } from './src/modules/base/user/api/user'
      export { createRegistry } from './src/services/registry'
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  define: { 'import.meta.hot': 'undefined', 'import.meta.env': '{}' },
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const { createAppRuntime, createSessionManager, createHttpClient, createRegistry, createUserApi } = compiled.exports
const storage = (values = new Map()) => ({
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
})
const credentials = account => ({
  access_token: `synthetic-${account}`,
  refresh_token: `refresh-${account}`,
  expire_at: 60,
})
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })

test('认证头只允许发送到 API 来源，Hook 修改目标也不能绕过检查', async () => {
  let redirect = false
  let sent = 0
  const http = createHttpClient({
    baseURL: '/api',
    origin: 'https://app.example.invalid',
    session: () => ({ token: 'synthetic', language: 'zh', sessionVersion: 1, refreshToken: async () => false }),
    callHooks: async (hook, config) => {
      if (hook === 'networkRequest' && redirect) config.url = 'https://other.example.invalid/data'
    },
  })
  http.defaults.adapter = async config => {
    sent++
    return response(config, { code: 200 })
  }
  for (const url of [
    'https://other.example.invalid/data',
    '//other.example.invalid/data',
    'https://user:password@app.example.invalid/data',
  ])
    await assert.rejects(http.get(url), error => error.code === 'forbidden')
  assert.equal(sent, 0)
  await http.get('/data')
  assert.equal(sent, 1)
  redirect = true
  await assert.rejects(http.get('/data'), error => error.code === 'forbidden')
  assert.equal(sent, 1)
})

test('共享存储账号切换会清除旧资料和权限，不使用新账号刷新旧会话', async () => {
  const shared = storage()
  let refreshes = 0
  const ports = {
    storage: shared,
    prefix: 'audit_',
    api: {
      login: async () => ({ data: { data: credentials('A') } }),
      refresh: async () => {
        refreshes++
        return { data: { data: credentials('B') } }
      },
      logout: async () => undefined,
      info: async () => ({ data: { data: { username: 'AccountA' } } }),
    },
    menus: {
      clearMenus() {},
      refreshMenus: async () => [{ name: 'A-permission' }],
      refreshRoles: async () => ['A-role'],
    },
    callHooks: async () => undefined,
    applySettings() {},
  }
  const a = createSessionManager(ports)
  await a.getState().loginWithTokens(credentials('A'))
  await a.getState().hydrate()
  const version = a.getState().sessionVersion
  const b = createSessionManager(ports)
  await b.getState().loginWithTokens(credentials('B'))
  assert.equal(await a.getState().refreshToken(), false)
  assert.equal(refreshes, 0)
  assert.equal(a.getState().token, credentials('B').access_token)
  assert.equal(a.getState().userInfo, null)
  assert.deepEqual(a.getState().permissions, [])
  assert.deepEqual(a.getState().roles, [])
  assert.ok(a.getState().sessionVersion > version)
  a.dispose()
  b.dispose()
})

test('两个 runtime 的认证、请求、缓存和释放互相隔离', async t => {
  const a = createAppRuntime({ storage: storage(), baseURL: 'https://a.example.invalid' })
  const b = createAppRuntime({ storage: storage(), baseURL: 'https://b.example.invalid' })
  t.after(() => {
    a.dispose()
    b.dispose()
  })
  await a.session.getState().loginWithTokens(credentials('A'))
  await b.session.getState().loginWithTokens(credentials('B'))
  a.http.defaults.adapter = async config => response(config, { header: config.headers.get('Authorization') })
  b.http.defaults.adapter = async config => response(config, { header: config.headers.get('Authorization') })
  assert.equal((await a.http.get('/data')).data.header, 'Bearer synthetic-A')
  assert.equal((await b.http.get('/data')).data.header, 'Bearer synthetic-B')
  a.query.setQueryData(['test'], 'A')
  b.query.setQueryData(['test'], 'B')
  a.dispose()
  assert.equal(a.query.getQueryData(['test']), undefined)
  assert.equal(b.query.getQueryData(['test']), 'B')
})

test('订阅者异常不破坏注册所有权或阻止其他订阅者', async () => {
  let errors = 0,
    notified = 0
  const slots = createRegistry(() => {
    errors++
  })
  slots.subscribe(() => {
    throw new Error('observer failure')
  })
  slots.subscribe(() => {
    notified++
  })
  const dispose = slots.register({ id: 'owned' })
  assert.equal(slots.getSnapshot().length, 1)
  dispose()
  assert.deepEqual(slots.getSnapshot(), [])
  assert.equal(errors, 2)
  assert.equal(notified, 2)
})

test('业务 API 的请求、缓存和失效使用同一个注入 runtime', async () => {
  const a = createAppRuntime({ storage: storage() })
  const b = createAppRuntime({ storage: storage() })
  let reads = 0
  a.http.defaults.adapter = async config => {
    if (config.method === 'get') reads++
    return response(config, {
      code: 200,
      data: config.method === 'get' ? { list: [{ username: 'injected' }], total: 1 } : null,
    })
  }
  b.http.defaults.adapter = async () => {
    throw new Error('wrong runtime')
  }
  try {
    const api = createUserApi(a)
    const [first, second] = await Promise.all([api.pageUsers({ page: 1 }), api.pageUsers({ page: 1 })])
    assert.equal(first.data.data.list[0].username, 'injected')
    assert.equal(second.data.data.total, 1)
    assert.equal(reads, 1)
    assert.equal(a.query.getQueryCache().getAll().length, 1)
    assert.equal(b.query.getQueryCache().getAll().length, 0)
    await api.saveUser(1, { username: 'changed' })
    assert.equal(a.query.getQueryCache().getAll()[0].state.isInvalidated, true)
  } finally {
    a.dispose()
    b.dispose()
  }
})

test('插件字典在本 runtime 可消费，释放后回收，不影响另一个实例', async () => {
  const a = createAppRuntime({ storage: storage() })
  const b = createAppRuntime({ storage: storage() })
  try {
    await a.plugins.register(
      {
        config: { enable: true, info: { name: 'dictionary-owner', version: '1.0.0' } },
        install: runtime => runtime.dictionaries.register('test', [{ label: 'A', value: 1 }]),
      },
      a,
    )
    assert.equal(a.dictionaries.store.getState().t('test', 1), 'A')
    assert.equal(b.dictionaries.store.getState().find('test'), null)
    a.plugins.dispose()
    assert.equal(a.dictionaries.store.getState().find('test'), null)
  } finally {
    a.dispose()
    b.dispose()
  }
})

test('挂起的网络钩子能超时或取消，且不会发送请求', async () => {
  let calls = 0
  const http = createHttpClient({
    session: () => ({ token: null, language: 'zh', sessionVersion: 1, refreshToken: async () => false }),
    callHooks: () => new Promise(() => {}),
    hookTimeout: 10,
  })
  http.defaults.adapter = async config => {
    calls++
    return response(config, {})
  }
  await assert.rejects(http.get('/test'), error => /timed out/.test(error.message))
  const controller = new AbortController()
  const request = http.get('/test', { signal: controller.signal })
  controller.abort()
  await assert.rejects(request, error => error.name === 'AbortError' || error.code === 'ERR_CANCELED')
  assert.equal(calls, 0)
})
