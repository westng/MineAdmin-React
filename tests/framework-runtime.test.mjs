import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'
const require = createRequire(import.meta.url)
const result = await build({
  stdin: {
    contents: `
  export { createRouteRegistry } from './src/router/registry'
  export { hasMatchedRouteAccess, hasRouteAccess } from './src/router/access'
  export { routePatternsOverlap } from './src/router/path-pattern'
  export { menusSchema } from './src/modules/base/permission/menu/api/schema'
  export { createComponentManifest } from './src/router/manifest'
  export { createPluginHost } from './src/provider/plugins/host'
  export { createLocaleRegistry } from './src/provider/i18n/registry'
  export { createLayoutRegistry } from './src/layouts/registry'
  export { createQueryClient, bindQuerySession, queryKeys } from './src/provider/query/client'
  export { createResourceQueries } from './src/provider/query/resource'
  export { createSessionManager } from './src/services/auth/session-manager'
  export { evaluateAccess } from './src/services/auth/access'
  export { resolveIframeSource } from './src/services/navigation/iframe-policy'
  export { registerDictionary, useDictStore } from './src/provider/dictionary'
  export { reportError } from './src/services/telemetry'
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
const defer = () => {
  let resolve
  const promise = new Promise(r => {
    resolve = r
  })
  return { promise, resolve }
}

test('Route Registry gives static routes ownership and intersects menu/plugin restrictions', () => {
  const registry = core.createRouteRegistry()
  const element = { stable: true }
  registry.configure({
    layout: {
      name: 'root',
      path: '/',
      children: [{ name: 'users', path: 'users', element, meta: { permission: 'read' } }],
    },
    guests: [{ name: 'login', path: '/login' }],
    publics: [],
    renderMenu: () => null,
  })
  registry.setMenus([
    {
      name: 'root-menu',
      meta: { role: 'staff' },
      children: [{ name: 'users-menu', path: '/users', meta: { permission: 'users' } }],
    },
  ])
  const dispose = registry.register('plugin', [{ name: 'plugin-users', path: '/users', meta: { user: 'alice' } }])
  const routes = registry.getSnapshot().protectedRoutes[0].children
  assert.equal(routes.length, 1)
  assert.equal(routes[0].element, element)
  assert.deepEqual(routes[0].accessMeta, [{ role: 'staff' }, { permission: 'users' }, { user: 'alice' }])
  assert.equal(registry.getSnapshot(), registry.getSnapshot())
  assert.throws(() => registry.register('other', [{ name: 'same', path: 'users' }]), /conflict/)
  dispose()
  assert.throws(
    () => registry.register('public-users', [{ name: 'public-users', path: '/users', scope: 'public' }]),
    /Protected route conflict/,
  )
  assert.throws(
    () => registry.register('protected-login', [{ name: 'protected-login', path: '/login' }]),
    /Reserved route/,
  )
  assert.equal(registry.getSnapshot().protectedRoutes[0].children[0].accessMeta.length, 2)
  registry.clearMenus()
  assert.equal(registry.getSnapshot().menuRoutes.length, 0)
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

test('Equivalent menu/static patterns retain all access restrictions and static component ownership', () => {
  const registry = core.createRouteRegistry()
  const element = { static: true }
  registry.configure({
    layout: {
      name: 'root',
      path: '/',
      children: [
        { name: 'reports', path: 'reports', element },
        { name: 'detail', path: 'reports/:id', element },
      ],
    },
    guests: [],
    publics: [],
    renderMenu: () => null,
  })
  registry.setMenus([
    { path: '/REPORTS/', meta: { permission: 'reports:read' } },
    { path: '/REPORTS/:reportId', meta: { auth: ['reports:detail'] } },
  ])
  const snapshot = registry.getSnapshot()
  assert.equal(snapshot.protectedRoutes[0].children.length, 2)
  assert.equal(snapshot.protectedRoutes[0].children[0].element, element)
  for (const path of ['/reports', '/REPORTS/', '/reports/42']) {
    assert.equal(
      core.hasMatchedRouteAccess(snapshot.protectedRoutes, path, { permissions: [], roles: [], userInfo: null }),
      false,
    )
  }
  assert.equal(
    core.hasMatchedRouteAccess(snapshot.protectedRoutes, '/reports/42', {
      permissions: ['reports:detail'],
      roles: [],
      userInfo: null,
    }),
    true,
  )
})

test('Cross-scope route conflicts follow case, parameter, optional-segment and splat matching', () => {
  const overlaps = [
    ['reports', '/REPORTS/'],
    ['reports', '/reports/*'],
    ['reports/:id', '/reports/42'],
    ['reports/:id?', '/reports'],
    [':locale?/reports', '/reports'],
    ['reports/:id/*', '/reports/:slug/settings'],
    ['reports/edit?', '/reports'],
    ['reports/:id', '/reports/:slug?'],
  ]
  for (const [protectedPath, publicPath] of overlaps) {
    assert.equal(core.routePatternsOverlap(protectedPath, publicPath), true)
    for (const scope of ['public', 'guest']) {
      const registry = core.createRouteRegistry()
      registry.configure({
        layout: {
          name: 'root',
          path: '/',
          children: [
            { name: 'protected', path: protectedPath },
            { name: 'fallback', path: '*' },
          ],
        },
        guests: [],
        publics: [{ name: 'not-found', path: '*' }],
        renderMenu: () => null,
      })
      const before = registry.getSnapshot()
      assert.throws(
        () => registry.register('extension', [{ name: 'extension', path: publicPath, scope }]),
        /Protected route conflict/,
      )
      assert.equal(registry.getSnapshot(), before)
    }
  }
  assert.equal(core.routePatternsOverlap('/reports/:id', '/settings/:id'), false)
  const registry = core.createRouteRegistry()
  registry.configure({
    layout: { name: 'root', path: '/', children: [{ name: 'fallback', path: '*' }] },
    guests: [{ name: 'login', path: '/login' }],
    publics: [],
    renderMenu: () => null,
  })
  registry.register('docs', [{ name: 'docs', path: '/docs/*', scope: 'public' }])
  const before = registry.getSnapshot()
  assert.throws(
    () => registry.setMenus([{ name: 'restricted', path: '/DOCS/private', meta: { permission: 'secret' } }]),
    /Protected route conflict/,
  )
  assert.equal(registry.getSnapshot(), before)
  assert.throws(() => registry.register('login', [{ name: 'login', path: '/LOGIN/' }]), /Reserved route/)
  assert.throws(
    () => registry.register('auth', [{ name: 'auth', path: '/auth', scope: 'public', meta: { auth: ['secret'] } }]),
    /access policies/,
  )
  assert.throws(
    () => registry.register('query', [{ name: 'query', path: '/query?value=x' }]),
    /Invalid route descriptor/,
  )
  const { matchRoutes } = require('react-router-dom')
  const branch = matchRoutes(
    [{ id: 'protected', path: '/', children: [{ path: '*' }] }, ...registry.getSnapshot().publicRoutes],
    '/docs/intro',
  )
  assert.equal(branch.at(-1).route.name, 'docs')
})

test('Component Manifest only resolves exact registered IDs and explicit aliases', () => {
  const manifest = core.createComponentManifest()
  const dispose = manifest.register([
    { id: 'base/users', aliases: ['base/views/users/index'], load: async () => ({ default: () => null }) },
  ])
  assert.equal(manifest.resolve('base/users'), manifest.resolve('base/views/users/index.tsx'))
  assert.equal(manifest.resolve('users'), null)
  assert.equal(manifest.resolve('../base/users'), null)
  assert.equal(manifest.resolve('https://example.com/script.js'), null)
  assert.throws(() => manifest.register([{ id: 'base/users', load: async () => ({}) }]), /duplicate/)
  dispose()
  manifest.register([{ id: 'base/users', load: async () => ({ default: () => null }) }])
  dispose()
  assert.ok(manifest.resolve('base/users'))
})

function pluginHarness() {
  const active = new Set()
  const register = value => {
    assert.ok(!active.has(value))
    active.add(value)
    return () => active.delete(value)
  }
  const host = core.createPluginHost({
    route: (_, route) => register(route.name),
    locale: value => register(value.id),
    dictionary: name => register(name),
    slot: value => register(value.id),
    toolbar: value => register(value.id),
  })
  return { host, active }
}
const manifest = id => ({
  id,
  version: '1.0.0',
  coreApi: 1,
  capabilities: ['route', 'locale', 'dictionary', 'slot', 'toolbar'],
})

test('Plugin Host installs once, releases every resource, and supports re-enable', async () => {
  const { host, active } = pluginHarness()
  let setups = 0
  let disposed = 0
  const plugin = {
    manifest: manifest('demo'),
    setup(ctx) {
      setups++
      ctx.registerRoute({ name: 'route', path: '/demo' })
      ctx.registerLocale({ id: 'locale', locale: 'en_US', namespace: 'demo', messages: {} })
      ctx.registerDictionary('dictionary', [])
      ctx.registerSlot({ id: 'slot', slot: 'shell.overlays', component: () => null })
      ctx.registerToolbar({ id: 'toolbar', slot: 'shell.toolbar', component: () => null })
      return () => disposed++
    },
  }
  await Promise.all([host.enable(plugin), host.enable(plugin)])
  assert.equal(setups, 1)
  assert.equal(active.size, 5)
  host.disable('demo')
  host.disable('demo')
  assert.equal(active.size, 0)
  assert.equal(disposed, 1)
  await host.enable(plugin)
  assert.equal(setups, 2)
  host.dispose()
  assert.equal(active.size, 0)
})

test('Failed plugins roll back registrations; missing capabilities and incompatible versions fail closed', async () => {
  const { host, active } = pluginHarness()
  await host.enable({
    manifest: manifest('broken'),
    setup(ctx) {
      ctx.registerDictionary('temporary', [])
      throw new Error('private-token-payload')
    },
  })
  assert.equal(active.size, 0)
  assert.equal(host.isEnabled('broken'), false)
  assert.deepEqual(host.getErrors(), { broken: '插件初始化失败' })
  await host.enable({
    manifest: { ...manifest('denied'), capabilities: [] },
    setup: ctx => ctx.registerDictionary('no', []),
  })
  assert.equal(active.size, 0)
  assert.throws(() => host.enable({ manifest: { ...manifest('unsupported'), coreApi: 2 }, setup() {} }))
})

test('Disable during async setup cannot leak resources or remove a newer installation', async () => {
  const { host, active } = pluginHarness()
  const pending = defer()
  let disposed = 0
  const old = host.enable({
    manifest: manifest('race'),
    async setup(ctx) {
      ctx.registerDictionary('old', [])
      await pending.promise
      return () => disposed++
    },
  })
  await Promise.resolve()
  host.disable('race')
  await host.enable({ manifest: manifest('race'), setup: ctx => ctx.registerDictionary('new', []) })
  pending.resolve()
  await old
  assert.deepEqual([...active], ['new'])
  assert.equal(disposed, 1)
  host.dispose()
  assert.equal(active.size, 0)
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
  registry.register({ id: 'mixed', label: 'Mixed', navigation: () => null, enabled: false })
  assert.equal(registry.resolve('columns').id, 'columns')
  assert.equal(registry.resolve('unknown').id, 'classic')
  assert.equal(registry.resolve('mixed').id, 'classic')
  remove()
  assert.equal(registry.resolve('columns').id, 'classic')
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

test('Plugin batches sort by order and isolate malformed manifests without aborting valid plugins', async () => {
  const { host } = pluginHarness()
  const seen = []
  const plugin = (id, order) => ({
    manifest: { ...manifest(id), order },
    setup: () => {
      seen.push(id)
    },
  })
  await host.enableAll([
    plugin('last', 10),
    { manifest: { id: 42 }, setup() {} },
    plugin('first', -1),
    plugin('middle', 0),
  ])
  assert.deepEqual(seen, ['first', 'middle', 'last'])
  assert.equal(host.isEnabled('middle'), true)
  assert.equal(Object.keys(host.getErrors()).length, 1)
  host.dispose()
})

test('Host disposal invalidates a pending batch without cancelling a later explicit installation', async () => {
  const { host, active } = pluginHarness()
  const blocked = defer()
  const seen = []
  const pending = host.enableAll([
    {
      manifest: manifest('a'),
      async setup(ctx) {
        seen.push('a')
        ctx.registerSlot({ id: 'a-slot', slot: 'shell.toolbar', component: () => null })
        await blocked.promise
      },
    },
    {
      manifest: manifest('b'),
      setup(ctx) {
        seen.push('b')
        ctx.registerSlot({ id: 'b-slot', slot: 'shell.toolbar', component: () => null })
      },
    },
  ])
  await Promise.resolve()
  host.dispose()
  assert.equal(active.size, 0)
  await host.enableAll([
    {
      manifest: manifest('new'),
      setup(ctx) {
        ctx.registerSlot({ id: 'new-slot', slot: 'shell.toolbar', component: () => null })
      },
    },
  ])
  blocked.resolve()
  await pending
  assert.deepEqual(seen, ['a'])
  assert.equal(host.isEnabled('b'), false)
  assert.equal(host.isEnabled('new'), true)
  assert.deepEqual([...active], ['new-slot'])
  host.dispose()
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
