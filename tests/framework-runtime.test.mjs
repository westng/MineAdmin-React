import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'
const require = createRequire(import.meta.url)
const result = await build({
  stdin: {
    contents: `
  export { hasRouteAccess } from './src/services/auth/access'
  export { menusSchema } from './src/services/navigation/schemas'
  export { createPluginHost } from './src/provider/plugins/host'
  export { createLocaleRegistry } from './src/services/i18n/registry'
  export { createLayoutRegistry } from './src/layouts/registry'
  export { createQueryClient, bindQuerySession, queryKeys } from './src/services/query/client'
  export { createResourceQueries } from './src/services/query/resource'
  export { createSessionManager } from './src/services/auth/session-manager'
  export { evaluateAccess } from './src/services/auth/access'
  export { resolveIframeSource } from './src/services/navigation/iframe-policy'
  import { createDictionaryManager } from './src/services/dictionary/manager'
const dictionary = createDictionaryManager()
export const registerDictionary = dictionary.register
export const useDictStore = dictionary.store
  export { reportError } from './src/services/telemetry'
  export { createSettingsStore } from './src/store/settings/create-store'
  export { dashboardPage } from './src/router/dashboard'
  export { createCache } from './src/services/storage/cache'
  export { createTabStore } from './src/store/tabs/create-store'
`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const core = module.exports

test('Dashboard remains the homepage when cached or account settings contain a retired welcome page', () => {
  const storage = new Map()
  const cache = core.createCache(
    {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    'dashboard_',
  )
  cache.set('settings', {
    welcomePage: { name: 'welcome', path: '/welcome', title: '欢迎页' },
    app: { colorMode: 'dark', layout: 'columns' },
  })
  const store = core.createSettingsStore(cache, 'Dashboard test', core.dashboardPage)
  const assertDashboard = settings => {
    assert.equal(settings.dashboardPage.name, 'dashboard')
    assert.equal(settings.dashboardPage.path, '/dashboard')
    assert.equal(settings.dashboardPage.title, '仪表盘')
    assert.equal(Object.hasOwn(settings, 'welcomePage'), false)
  }
  assertDashboard(store.getState().settings)
  assertDashboard(cache.get('settings'))
  assert.equal(store.getState().settings.app.colorMode, 'dark')
  assert.equal(store.getState().settings.app.layout, 'columns')
  store.getState().setSettings({
    welcomePage: { name: 'welcome', path: '/welcome', title: '欢迎页' },
    dashboardPage: { name: 'welcome', path: '/welcome' },
    app: { primaryColor: '#123456' },
  })
  assertDashboard(store.getState().settings)
  assertDashboard(cache.get('settings'))
  assert.equal(store.getState().settings.app.colorMode, 'dark')
  assert.equal(store.getState().settings.app.primaryColor, '#123456')
})

test('Restoring tabs removes the retired welcome page and pins the current dashboard without losing business tabs', () => {
  const cached = new Map([
    [
      'tabs',
      [
        { name: 'welcome', path: '/welcome', fullPath: '/welcome', title: '欢迎页', affix: true },
        { name: 'orders', path: '/orders', fullPath: '/orders?page=2', title: '订单' },
        { name: 'dashboard', path: '/dashboard', fullPath: '/dashboard', title: '旧首页标题' },
      ],
    ],
  ])
  const store = core.createTabStore({
    get: (key, fallback) => cached.get(key) ?? fallback,
    set: (key, value) => cached.set(key, value),
    remove: key => cached.delete(key),
  })
  const dashboard = { name: 'dashboard', path: '/dashboard', fullPath: '/dashboard', title: '仪表盘', affix: true }
  store.getState().init(dashboard)
  assert.deepEqual(store.getState().tabs, [
    dashboard,
    { name: 'orders', path: '/orders', fullPath: '/orders?page=2', title: '订单' },
  ])
  assert.deepEqual(cached.get('tabs'), store.getState().tabs)
  store.getState().init(dashboard)
  assert.equal(store.getState().tabs.length, 2)
  store.getState().close('/dashboard')
  assert.equal(store.getState().tabs[0].fullPath, '/dashboard')
})

const defer = () => {
  let resolve
  const promise = new Promise(r => {
    resolve = r
  })
  return { promise, resolve }
}

function sessionFixture(api = {}) {
  const storage = new Map()
  const events = []
  const session = core.createSessionManager({
    prefix: 'disposed_',
    storage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    api: { logout: async () => events.push('logout'), ...api },
    menus: {
      clearMenus: () => events.push('clearMenus'),
      refreshMenus: async () => {
        events.push('menus')
        return []
      },
      refreshRoles: async () => {
        events.push('roles')
        return []
      },
    },
    callHooks: async name => events.push(name),
    applySettings: () => events.push('settings'),
  })
  return { session, storage, events }
}

test('Disposed sessions abort login, reject late credentials and cannot start new operations', async () => {
  const pending = defer()
  let signal
  let calls = 0
  const { session, storage, events } = sessionFixture({
    login: (_data, requestSignal) => {
      calls++
      signal = requestSignal
      return pending.promise
    },
  })
  const credentials = { access_token: 'fixture', refresh_token: 'fixture-refresh', expire_at: 100 }
  const login = session.getState().login({ username: 'fixture', password: 'fixture' })
  const rejected = assert.rejects(login, { name: 'AbortError' })
  await Promise.resolve()
  session.dispose()
  session.dispose()
  assert.equal(signal.aborted, true)
  pending.resolve({ data: { data: credentials } })
  await rejected
  assert.equal(storage.size, 0)
  assert.deepEqual(events, ['loginBefore'])
  await assert.rejects(session.getState().login({ username: 'next', password: 'fixture' }), { name: 'AbortError' })
  await assert.rejects(session.getState().loginWithTokens(credentials), { name: 'AbortError' })
  assert.equal(await session.getState().hydrate(), false)
  assert.equal(await session.getState().refreshToken(), false)
  await session.getState().logout()
  assert.throws(() => session.getState().setUserInfo({ username: 'next' }), { name: 'AbortError' })
  assert.throws(() => session.getState().setLanguage('en_US'), { name: 'AbortError' })
  assert.equal(calls, 1)
  assert.equal(storage.size, 0)
  assert.deepEqual(events, ['loginBefore'])
})

test('Disposal cancels token refresh without clearing or replacing completed credentials', async () => {
  const pending = defer()
  let signal
  const { session, storage } = sessionFixture({
    refresh: (_token, requestSignal) => {
      signal = requestSignal
      return pending.promise
    },
  })
  await session.getState().loginWithTokens({ access_token: 'saved', refresh_token: 'saved-refresh', expire_at: 100 })
  const saved = new Map(storage)
  const refresh = session.getState().refreshToken()
  session.dispose()
  assert.equal(signal.aborted, true)
  pending.resolve({ data: { data: { access_token: 'late', refresh_token: 'late-refresh', expire_at: 200 } } })
  assert.equal(await refresh, false)
  assert.deepEqual(storage, saved)
  assert.equal(session.getState().token, 'saved')
})

test('Disposed hydration does not load menus, apply preferences or overwrite persisted profile data', async () => {
  const pending = defer()
  const { session, storage, events } = sessionFixture({ info: () => pending.promise })
  await session.getState().loginWithTokens({ access_token: 'saved', refresh_token: 'refresh', expire_at: 100 })
  const saved = new Map(storage)
  events.length = 0
  const hydrated = session.getState().hydrate()
  session.dispose()
  pending.resolve({ data: { data: { username: 'late', backend_setting: { app: { colorMode: 'dark' } } } } })
  assert.equal(await hydrated, false)
  assert.deepEqual(storage, saved)
  assert.deepEqual(events, [])
})

test('Legacy menu permission fields normalize empty conditions and intersect every supplied alias', () => {
  const [menu] = core.menusSchema.parse([
    { name: 'reports', path: '/reports', meta: { auth: ['reports:read'], role: [], user: [] } },
  ])
  const reader = { permissions: ['reports:read'], roles: [], userInfo: { username: 'reader' } }
  assert.equal(menu.meta.role, undefined)
  assert.equal(menu.meta.user, undefined)
  assert.equal(core.hasRouteAccess(menu.meta, reader), true)
  assert.equal(core.hasRouteAccess(menu.meta, { ...reader, permissions: [] }), false)
  const [unrestricted] = core.menusSchema.parse([{ meta: { auth: [], role: [], user: [] } }])
  assert.equal(core.hasRouteAccess(unrestricted.meta, { ...reader, permissions: [] }), true)
  const combined = { ...menu.meta, permission: 'extra', permissions: ['other'], role: 'staff', roles: ['manager'] }
  assert.equal(core.hasRouteAccess(combined, reader), false)
  const complete = { ...reader, permissions: ['reports:read', 'extra', 'other'], roles: ['staff', 'manager'] }
  assert.equal(core.hasRouteAccess(combined, complete), true)
  for (const permission of complete.permissions) {
    assert.equal(
      core.hasRouteAccess(combined, { ...complete, permissions: complete.permissions.filter(p => p !== permission) }),
      false,
    )
  }
  for (const meta of [{ auth: [' '] }, { role: [false] }, { user: [null] }, { permission: [] }, { permissions: [] }]) {
    assert.equal(core.menusSchema.safeParse([{ meta }]).success, false)
  }
  assert.equal(core.hasRouteAccess({ auth: false, permission: 'denied' }, reader), false)
  assert.equal(core.hasRouteAccess({ permission: [] }, { ...reader, permissions: ['*'] }), false)
})

test('Locale namespace conflicts reject atomically; missing translations fall back without losing empty strings', () => {
  const locales = core.createLocaleRegistry()
  const dispose = locales.register({
    id: 'zh',
    namespace: 'demo',
    locale: 'zh_CN',
    messages: { title: '标题', empty: '' },
  })
  locales.register({ id: 'custom', namespace: 'demo', locale: 'fr_FR', messages: { title: 'Titre' } })
  assert.equal(locales.translate('fr_FR', 'demo', 'title'), 'Titre')
  assert.equal(locales.translate('en_US', 'demo', 'title'), '标题')
  assert.equal(locales.translate('en_US', 'demo', 'empty', 'fallback'), '')
  assert.throws(
    () => locales.register({ id: 'duplicate', namespace: 'demo', locale: 'zh_CN', messages: { title: 'collision' } }),
    /conflict/,
  )
  dispose()
  assert.equal(locales.translate('en_US', 'demo', 'title', 'fallback'), 'fallback')
})

test('Layout selection safely falls back for missing or disabled IDs', () => {
  const fallback = { id: 'classic', label: 'Classic', navigation: () => null }
  const registry = core.createLayoutRegistry(fallback)
  const remove = registry.register({ id: 'columns', label: 'Columns', navigation: () => null })
  registry.register({ id: 'mixed', aliases: ['legacy-mixed'], label: 'Mixed', navigation: () => null, enabled: false })
  assert.equal(registry.resolve('columns').id, 'columns')
  assert.equal(registry.resolve('columns').id, 'columns')
  assert.equal(registry.resolve('unknown').id, 'classic')
  assert.equal(registry.resolve('mixed').id, 'classic')
  assert.equal(registry.resolve('legacy-mixed').id, 'classic')
  remove()
  assert.equal(registry.resolve('columns').id, 'classic')
  assert.equal(registry.resolve('verve').id, 'classic')
})

test('Permission, role and user conditions intersect; malformed conditions reject even for wildcard principals', () => {
  const subject = { permissions: ['read'], roles: ['staff'], userInfo: { username: 'alice' } }
  assert.equal(core.evaluateAccess({ permission: 'read', role: 'staff', user: 'alice' }, subject), true)
  for (const policy of [
    { permission: 'write' },
    { role: 'admin' },
    { user: 'bob' },
    { permission: [] },
    { permission: {} },
    { permisssion: 'read' },
  ])
    assert.equal(core.evaluateAccess(policy, subject), false)
  assert.equal(core.evaluateAccess({ permission: [] }, { ...subject, permissions: ['*'] }), false)
})

test('Iframe origins require exact allowlist matches and reject credentials and dangerous schemes', () => {
  const policy = { allowedOrigins: ['https://trusted.example'], sandbox: 'allow-scripts' }
  assert.equal(core.resolveIframeSource('https://trusted.example/page', policy), 'https://trusted.example/page')
  for (const source of [
    'javascript:alert(1)',
    '//trusted.example/page',
    'https://trusted.example.evil.test',
    'https://user:pass@trusted.example',
    'https://trusted.example:8443',
  ])
    assert.equal(core.resolveIframeSource(source, policy), null)
})

test('Query requests deduplicate; session changes abort requests and erase cached data before old responses settle', async t => {
  const client = core.createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  t.after(() => client.clear())
  const storage = new Map()
  const session = core.createSessionManager({
    prefix: 'test_',
    storage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    api: {},
    menus: { clearMenus() {} },
    callHooks: async () => {},
    applySettings() {},
  })
  const unbind = core.bindQuerySession(client, session)
  t.after(unbind)
  const pending = defer()
  let calls = 0
  let signal
  const query = {
    queryKey: core.queryKeys.resource(0, 'demo', 'records'),
    queryFn: context => {
      calls++
      signal = context.signal
      return pending.promise
    },
  }
  const first = client.fetchQuery(query).catch(error => error)
  const second = client.fetchQuery(query).catch(error => error)
  assert.equal(calls, 1)
  await session
    .getState()
    .loginWithTokens({ access_token: 'synthetic', refresh_token: 'synthetic-refresh', expire_at: 100 })
  assert.equal(signal.aborted, true)
  assert.equal(client.getQueryCache().getAll().length, 0)
  pending.resolve('old data')
  await Promise.all([first, second])
  assert.equal(client.getQueryData(query.queryKey), undefined)
})

test('Query retries transient reads once and never retries validation, authorization or writes', async t => {
  const client = core.createQueryClient()
  t.after(() => client.clear())
  for (const [code, status, expected] of [
    ['validation', undefined, 1],
    ['unauthorized', 401, 1],
    [422, undefined, 1],
    ['network', 503, 2],
  ]) {
    let calls = 0
    const error = Object.assign(new Error('safe test error'), { code, ...(status ? { status } : {}) })
    await assert.rejects(
      client.fetchQuery({
        queryKey: ['retry', code],
        retryDelay: 0,
        gcTime: Infinity,
        queryFn: async () => {
          calls++
          throw error
        },
      }),
    )
    assert.equal(calls, expected)
  }
  assert.equal(client.getDefaultOptions().mutations.retry, false)
})

test('Dictionary disposal handles out-of-order owners and restores baseline', () => {
  core.useDictStore.getState().push('test-baseline', [{ label: 'base', value: 0 }])
  const first = core.registerDictionary('test-baseline', [{ label: 'first', value: 1 }], true)
  const second = core.registerDictionary('test-baseline', [{ label: 'second', value: 2 }], true)
  first()
  second()
  assert.equal(core.useDictStore.getState().find('test-baseline')[0].value, 0)
  core.useDictStore.getState().remove('test-baseline')
})

test('Telemetry never receives raw error messages, request payloads or credentials', () => {
  const events = []
  core.reportError({ report: event => events.push(event) }, { code: 401, message: 'secret', token: 'secret' }, 'auth')
  assert.deepEqual(events, [{ code: 'unauthorized', module: 'auth', status: 401 }])
  assert.doesNotThrow(() =>
    core.reportError(
      {
        report() {
          throw Error('offline')
        },
      },
      Error('secret'),
      'app',
    ),
  )
})

test('Resource queries separate list/detail keys, cancel pre-write reads and never invalidate a new session', async t => {
  const client = core.createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  t.after(() => client.clear())
  let version = 1
  const resource = core.createResourceQueries('base', 'users', client, () => version)
  assert.equal(await resource.fetch({ id: 7 }, async () => 'list'), 'list')
  assert.equal(await resource.detail(7, async () => 'detail'), 'detail')
  assert.equal(client.getQueryCache().getAll().length, 2)
  const read = defer()
  let signal
  const pending = resource
    .fetch({}, current => {
      signal = current
      return read.promise
    })
    .catch(error => error)
  await resource.mutate(async () => ({ data: { code: 200 } }))
  assert.equal(signal.aborted, true)
  read.resolve('stale-before-write')
  await pending
  assert.equal(client.getQueryData([...resource.key(), 'list', {}]), undefined)
  const write = defer()
  const oldMutation = resource.mutate(() => write.promise).catch(error => error)
  version = 2
  await resource.detail(7, async () => 'new-account')
  write.resolve({ data: { code: 200 } })
  assert.equal((await oldMutation).name, 'AbortError')
  assert.equal(client.getQueryState([...resource.key(), 'detail', 7]).isInvalidated, false)
})

test('Cancelling one resource consumer preserves a shared query for other consumers', async t => {
  const client = core.createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  t.after(() => client.clear())
  const resource = core.createResourceQueries('base', 'attachments', client, () => 1)
  const pending = defer()
  const abort = new AbortController()
  let calls = 0
  let signal
  const load = current => {
    calls++
    signal = current
    return pending.promise
  }
  const first = resource.fetch({}, load, abort.signal).catch(error => error)
  const second = resource.fetch({}, load)
  abort.abort()
  assert.equal((await first).name, 'AbortError')
  assert.equal(signal.aborted, false)
  pending.resolve('shared result')
  assert.equal(await second, 'shared result')
  assert.equal(calls, 1)
})

// File-based routing and rendering cases live in framework-routing and framework-route-pages.
test('Plugin declarations enable views, notify consumers and release installations once', async () => {
  const host = core.createPluginHost()
  const events = []
  const unsubscribe = host.subscribe(() => events.push(host.getViews().length))
  const plugin = {
    config: { enable: true, info: { name: 'example/report', version: '1' } },
    views: [{ name: 'help', path: '/help', component: async () => ({ default: () => null }) }],
    install: () => {
      events.push('install')
      return () => events.push('dispose')
    },
  }
  await host.register(plugin, {})
  assert.equal(host.getViews().length, 1)
  await assert.rejects(host.register(plugin, {}), /重复/)
  host.dispose()
  host.dispose()
  unsubscribe()
  assert.equal(events.filter(v => v === 'install').length, 1)
  assert.equal(events.filter(v => v === 'dispose').length, 1)
  assert.equal(host.getViews().length, 0)
})

test('Disabled or failed plugins publish no views and do not prevent valid plugins', async () => {
  const host = core.createPluginHost()
  const config = (name, enable = true) => ({ enable, info: { name, version: '1' } })
  await host.register(
    {
      config: config('disabled', false),
      install: () => assert.fail('disabled installation'),
      views: [{ name: 'disabled', path: '/disabled' }],
    },
    {},
  )
  await host.register(
    {
      config: config('failed'),
      install: () => {
        throw new Error('fixture failure')
      },
    },
    {},
  )
  await host.register({ config: config('valid'), views: [{ name: 'valid', path: '/valid' }] }, {})
  assert.deepEqual(
    host.getViews().map(v => v.path),
    ['/valid'],
  )
  assert.equal(host.isEnabled('failed'), false)
  assert.equal(host.getErrors().failed, '插件初始化失败')
  host.dispose()
})

test('Disposing a pending plugin prevents its late installation from leaking into a new runtime', async () => {
  const host = core.createPluginHost()
  const pending = defer()
  let released = 0
  const config = () => ({ enable: true, info: { name: 'example/report', version: '1' } })
  const install = host.register(
    {
      config: config(),
      install: async () => {
        await pending.promise
        return () => released++
      },
    },
    {},
  )
  await new Promise(resolve => setImmediate(resolve))
  host.dispose()
  await host.register({ config: config(), views: [{ name: 'new', path: '/new' }] }, {})
  pending.resolve()
  await install
  assert.equal(released, 1)
  assert.deepEqual(
    host.getViews().map(v => v.path),
    ['/new'],
  )
  host.dispose()
})

test('Last resource consumer cancels transport across separate API factories and can retry', async t => {
  const client = core.createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  t.after(() => client.clear())
  const a = core.createResourceQueries('order', 'main', client, () => 1)
  const b = core.createResourceQueries('order', 'main', client, () => 1)
  const signals = []
  const load = signal => {
    signals.push(signal)
    return new Promise(() => {})
  }
  const first = new AbortController()
  const second = new AbortController()
  const one = a.fetch({}, load, first.signal).catch(error => error)
  const two = b.fetch({}, load, second.signal).catch(error => error)
  first.abort()
  assert.equal((await one).name, 'AbortError')
  assert.equal(signals[0].aborted, false)
  second.abort()
  assert.equal((await two).name, 'AbortError')
  assert.equal(signals[0].aborted, true)
  assert.equal(client.isFetching(), 0)
  assert.equal(await a.fetch({}, async () => 'retried'), 'retried')
})

test('Cancelling an imperative consumer preserves a mounted query observer', async t => {
  const { QueryObserver } = require('@tanstack/react-query')
  const client = core.createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  t.after(() => client.clear())
  const resource = core.createResourceQueries('order', 'main', client, () => 1)
  const pending = defer()
  let transport
  const list = resource.list((_params, signal) => {
    transport = signal
    return pending.promise
  })
  const observer = new QueryObserver(client, list.queryOptions({}))
  const unsubscribe = observer.subscribe(() => {})
  t.after(unsubscribe)
  const controller = new AbortController()
  const request = list({}, controller.signal).catch(error => error)
  controller.abort()
  assert.equal((await request).name, 'AbortError')
  assert.equal(transport.aborted, false)
  pending.resolve('observed')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(observer.getCurrentResult().data, 'observed')
})

test('Plugin failure and start hooks cannot mutate a definition shared by another runtime', async () => {
  const one = core.createPluginHost()
  const two = core.createPluginHost()
  const definition = {
    config: Object.freeze({ enable: true, info: Object.freeze({ name: 'shared', version: '1' }) }),
    install: runtime => {
      if (runtime.fail) throw new Error('local failure')
    },
  }
  await one.register(definition, { fail: true })
  await two.register(definition, {})
  assert.equal(one.isEnabled('shared'), false)
  assert.equal(two.isEnabled('shared'), true)
  assert.equal(definition.config.enable, true)
  const disabled = {
    config: { enable: true, info: { name: 'disabled-by-hook', version: '1' } },
    hooks: {
      start: config => {
        config.enable = false
      },
    },
  }
  await one.register(disabled, {})
  assert.equal(one.isEnabled('disabled-by-hook'), false)
  assert.equal(disabled.config.enable, true)
  one.dispose()
  two.dispose()
})

test('A React observer leaving cannot cancel another imperative consumer of the same request', async t => {
  const { QueryObserver } = require('@tanstack/react-query')
  const client = core.createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  t.after(() => client.clear())
  const resource = core.createResourceQueries('order', 'main', client, () => 1)
  const pending = defer()
  let transport
  const list = resource.list((_params, signal) => {
    transport = signal
    return pending.promise
  })
  const observer = new QueryObserver(client, list.queryOptions({}))
  const unsubscribe = observer.subscribe(() => {})
  const otherConsumer = list({})
  unsubscribe()
  assert.equal(transport.aborted, false)
  pending.resolve('still needed')
  assert.equal(await otherConsumer, 'still needed')
  assert.equal(
    client
      .getQueryCache()
      .find({ queryKey: list.queryOptions({}).queryKey })
      .getObserversCount(),
    0,
  )
})
