import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'
import { matchRoutes } from 'react-router-dom'
const require = createRequire(import.meta.url)
const result = await build({
  stdin: {
    contents: `
    export * from './src/router/dynamic-routes'
    export * from './src/router/navigation/menu'
    export { hasRouteAccess } from './src/services/auth/access'
    export { createNavigationManager } from './src/router/navigation/manager'
  `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const core = module.exports
function canAccessAt(routes, pathname, state) {
  const route = matchRoutes(routes, pathname)?.at(-1)?.route
  return Boolean(route && [route.meta, ...(route.accessMeta ?? [])].every(meta => core.hasRouteAccess(meta, state)))
}
const reader = { permissions: ['read'], roles: [], userInfo: { username: 'reader' } }
const moduleLoader = async () => ({ default: () => null })
const pluginLoader = async () => ({ default: () => null })
const view = core.createViewResolver({ '../modules/demo/views/index.tsx': moduleLoader })
const buildMenus = (menus, code = []) => core.menuToRoutes(menus, code, view)

test('View address selects the exact modules/plugins file; URL never participates', () => {
  const views = core.createViewResolver({
    '../modules/example/report/views/index.tsx': moduleLoader,
    '../plugins/example/report/views/index.tsx': pluginLoader,
  })
  assert.equal(views.resolve('example/report/views/index', 'modules/'), moduleLoader)
  assert.equal(views.resolve('example/report/views/index', 'plugins/'), pluginLoader)
  assert.equal(views.resolve('/example/report/views/index.vue', 'modules/'), moduleLoader)
  assert.equal(views.resolve('example/report/views/index'), undefined)
  assert.equal(views.resolve('example/report/views/index', 'invalid/'), undefined)
  assert.equal(views.resolve('../example/report/views/index', 'modules/'), undefined)
  const pluginOnly = core.createViewResolver({ '../plugins/example/report/views/index.tsx': pluginLoader })
  assert.equal(pluginOnly.has('example/report/views/index', 'modules/'), false)
  assert.equal(pluginOnly.resolve('example/report/views/index'), pluginLoader)
})

test('Base menus resolve their stored current view addresses without legacy aliases', () => {
  const files = Object.fromEntries(
    ['user', 'role', 'menu', 'department'].map(area => [`../modules/base/${area}/views/index.tsx`, moduleLoader]),
  )
  const views = core.createViewResolver(files)
  const menus = ['user', 'role', 'menu', 'department'].map(area => ({
    path: `/permission/${area}`,
    component: `base/${area}/views/index`,
    meta: { componentPath: 'modules/' },
  }))
  const { routes } = core.menuToRoutes(menus, [], views)
  for (const menu of menus) {
    assert.equal(views.resolve(menu.component, 'modules/'), moduleLoader)
    const area = menu.path.split('/').at(-1)
    assert.equal(views.resolve(`base/views/permission/${area}/index`, 'modules/'), undefined)
    assert.equal(views.resolve(`base/permission/${area}/views/index`, 'modules/'), undefined)
    assert.ok(routes.find(route => route.path === menu.path)?.element)
    assert.equal(views.resolve(menu.component, 'plugins/'), undefined)
  }
  assert.equal(views.keys().length, Object.keys(files).length)
})

test('Base view lookup uses only existing files and respects explicit sources', () => {
  const views = core.createViewResolver({
    '../modules/base/permission/user/views/index.tsx': moduleLoader,
    '../modules/base/user/views/index.tsx': pluginLoader,
    '../plugins/base/permission/user/views/index.tsx': pluginLoader,
  })
  assert.equal(views.resolve('base/permission/user/views/index', 'modules/'), moduleLoader)
  assert.equal(views.resolve('base/permission/user/views/index', 'plugins/'), pluginLoader)
  assert.equal(views.resolve('base/permission/user/views/index'), undefined)
})

test('Log and attachment menus require their current stored view addresses', () => {
  for (const [saved, current] of [
    ['base/views/log/userLogin', 'base/login-log/views/index'],
    ['base/views/log/userOperation', 'base/operation-log/views/index'],
    ['base/views/dataCenter/attachment/index', 'base/attachment/views/index'],
  ]) {
    const views = core.createViewResolver({ [`../modules/${current}.tsx`]: moduleLoader })
    assert.equal(views.resolve(saved, 'modules/'), undefined)
    assert.equal(views.resolve(current, 'modules/'), moduleLoader)
    assert.deepEqual(views.keys(), [`modules/${current}`])
  }
})

test('Disabled or ambiguous files affect their own views without breaking other pages', () => {
  let enabled = false
  const views = core.createViewResolver(
    { '../plugins/example/report/views/index.tsx': pluginLoader },
    name => name === 'example/report' && enabled,
  )
  assert.equal(views.has('example/report/views/index', 'plugins/'), false)
  enabled = true
  assert.equal(views.has('example/report/views/index', 'plugins/'), true)
  const ambiguous = core.createViewResolver({
    '../modules/demo/views/index.tsx': moduleLoader,
    '../modules/demo/views/index.jsx': pluginLoader,
    '../modules/demo/views/other.tsx': moduleLoader,
  })
  assert.equal(ambiguous.has('demo/views/index', 'modules/'), false)
  assert.equal(ambiguous.has('demo/views/other', 'modules/'), true)
})

test('Menu conversion creates page elements once, preserves input and inherits every ancestor policy', () => {
  const input = [
    {
      path: '/orders',
      meta: { hidden: true, permission: 'read' },
      children: [{ name: 'detail', path: ':id', component: 'demo/views/index', meta: { permission: 'detail' } }],
    },
  ]
  const original = structuredClone(input)
  const { menus, routes } = buildMenus(input)
  assert.deepEqual(input, original)
  assert.equal(menus[0].children[0].path, '/orders/:id')
  assert.equal(core.flattenVisibleMenus(menus).length, 0)
  assert.ok(routes.find(route => route.path === '/orders/:id').element)
  assert.equal('menu' in routes[0], false)
  assert.equal(canAccessAt(routes, '/orders/42', reader), false)
  assert.equal(canAccessAt(routes, '/orders/42', { ...reader, permissions: ['read', 'detail'] }), true)
})

test('Disabled branches and buttons do not create pages; wildcard directories keep their descendants', () => {
  const { routes } = buildMenus([
    { path: '/disabled', status: 2, children: [{ path: 'detail' }] },
    { path: '/button', meta: { type: 'B' } },
    {
      path: '/orders',
      component: 'demo/views/index',
      children: [{ path: '*', children: [{ path: 'history', component: 'demo/views/index' }] }],
    },
  ])
  assert.deepEqual(
    routes.map(route => route.path),
    ['/orders', '/orders/history'],
  )
  assert.ok(routes[0].element)
})

test('Root, login and malformed menu addresses cannot block all other routes', () => {
  const { routes } = buildMenus(
    [
      {
        path: '/',
        component: 'demo/views/index',
        meta: { permission: 'read' },
        children: [{ path: 'orders', component: 'demo/views/index' }],
      },
      { path: '/login', component: 'demo/views/index' },
      { path: 'https://invalid.test', component: 'demo/views/index' },
      { path: '/bad?query=1', component: 'demo/views/index' },
    ],
    [{ name: 'dashboard', path: '/dashboard', element: 'dashboard' }],
  )
  assert.deepEqual(
    routes.map(route => route.path),
    ['/dashboard', '/orders'],
  )
  assert.equal(canAccessAt(routes, '/orders', { ...reader, permissions: [] }), false)
})

test('Same-path code owns the component while every menu and code policy remains effective', () => {
  const { routes } = buildMenus(
    [{ path: '/dashboard', component: 'missing', meta: { permission: 'read', title: 'Menu' } }],
    [{ name: 'dashboard', path: '/dashboard', element: 'code-page', meta: { role: 'operator' } }],
  )
  assert.equal(routes.length, 1)
  assert.equal(routes[0].element, 'code-page')
  assert.equal(routes[0].meta.title, 'Menu')
  assert.equal(canAccessAt(routes, '/dashboard', reader), false)
  assert.equal(canAccessAt(routes, '/dashboard', { ...reader, roles: ['operator'] }), true)
})

test('Plugin static pages need no menu and dynamic pages need no repeated declaration', () => {
  const views = core.createViewResolver({ '../plugins/example/report/views/index.tsx': pluginLoader })
  const { routes } = core.menuToRoutes(
    [{ path: '/reports', component: 'example/report/views/index', meta: { componentPath: 'plugins/' } }],
    [{ name: 'help', path: '/help', component: moduleLoader }],
    views,
  )
  assert.deepEqual(
    routes.map(route => route.path),
    ['/help', '/reports'],
  )
  assert.ok(routes.every(route => route.element))
})

test('Equivalent code paths merge policies; native Router ranks static and parameter routes', () => {
  const { routes } = buildMenus(
    [],
    [
      { name: 'detail', path: '/orders/:id', element: 'first', meta: { permission: 'read' } },
      { name: 'alias', path: '/ORDERS/:orderId/', element: 'second', meta: { role: 'operator' } },
      { name: 'new', path: '/orders/new', element: 'new' },
    ],
  )
  assert.equal(routes.length, 2)
  assert.equal(routes[0].element, 'first')
  assert.equal(canAccessAt(routes, '/orders/42', reader), false)
  assert.equal(canAccessAt(routes, '/orders/new', reader), true)
})

test('Static redirects survive menu metadata and duplicate code declarations with all access restrictions', () => {
  for (const redirect of ['/new', ['/new', '/fallback']]) {
    const { routes } = buildMenus(
      [{ name: 'menu', path: '/old', redirect: '/menu-target', meta: { permission: 'menu:read' } }],
      [
        { name: 'legacy', path: '/old', redirect, meta: { permission: 'read' } },
        { name: 'duplicate', path: '/OLD/', redirect: '/ignored', meta: { role: 'operator' } },
      ],
    )
    assert.equal(routes.length, 1)
    assert.deepEqual(routes[0].redirect, redirect)
    assert.equal(canAccessAt(routes, '/old', reader), false)
    assert.equal(
      canAccessAt(routes, '/old', { ...reader, permissions: ['read', 'menu:read'], roles: ['operator'] }),
      true,
    )
  }
  const { routes } = buildMenus(
    [{ path: '/old', meta: { title: 'Old' } }],
    [{ name: 'legacy', path: '/old', redirect: '/new' }],
  )
  assert.equal(routes[0].redirect, '/new')
})

test('A default index child provides the page and keeps its parent restrictions', () => {
  const { routes } = buildMenus([
    {
      path: '/orders',
      meta: { permission: 'read' },
      children: [{ name: 'index', component: 'demo/views/index', meta: { role: 'operator' } }],
    },
  ])
  assert.equal(routes.length, 1)
  assert.ok(routes[0].element)
  assert.equal(routes[0].redirect, undefined)
  assert.equal(canAccessAt(routes, '/orders', reader), false)
})

test('Directory destinations are collected during conversion, excluding hidden and missing views', () => {
  const { routes } = buildMenus([
    {
      path: '/orders',
      children: [
        { path: 'empty' },
        { path: 'missing', component: 'missing' },
        { path: 'hidden', component: 'demo/views/index', meta: { hidden: true } },
        { path: 'list', component: 'demo/views/index' },
      ],
    },
  ])
  assert.deepEqual(routes.find(route => route.path === '/orders').redirect, ['/orders/list'])
})

test('External URLs remain link data, and internal targets preserve query URLs', () => {
  const { menus, routes } = buildMenus([
    { name: 'help', path: 'https://docs.example.test/guide?x=1', meta: { type: 'L' } },
  ])
  assert.equal(routes[0].path, '/MineLink/help')
  assert.ok(routes[0].element)
  assert.equal(core.getMenuLink(menus[0]), 'https://docs.example.test/guide?x=1')
  assert.equal(
    core.safeInternalTarget('/orders/list?returnTo=https://example.test/a#summary'),
    '/orders/list?returnTo=https://example.test/a#summary',
  )
  for (const target of ['https://evil.test', '//evil.test', '/%2e%2e/escape', '/\\evil.test'])
    assert.equal(core.safeInternalTarget(target), null)
})

test('Navigation publishes one converted snapshot, preserves it on HTTP failure and clears session menus', async () => {
  let failure = false,
    hookRoutes
  const navigation = core.createNavigationManager({
    query: { fetchQuery: ({ queryFn }) => queryFn({ signal: new AbortController().signal }) },
    session: () => ({ sessionVersion: 1 }),
    filterMenus: menus => menus,
    staticRoutes: [{ name: 'dashboard', path: '/dashboard', element: 'dashboard' }],
    views: () => [{ name: 'help', path: '/help', component: moduleLoader }],
    viewResolver: view,
    api: {
      getMenus: async () => {
        if (failure) throw new Error('temporary')
        return { data: { data: [{ path: '/orders', children: [{ path: 'list', component: 'demo/views/index' }] }] } }
      },
      getRoles: async () => ({ data: { data: [] } }),
    },
    callHooks: async (name, routes) => {
      if (name === 'registerRoute') hookRoutes = routes
    },
  })
  await navigation.getState().refreshMenus()
  const previous = navigation.getState().routes
  assert.equal(previous, hookRoutes)
  assert.equal(navigation.getState().menus[0].children[0].path, '/orders/list')
  failure = true
  await assert.rejects(navigation.getState().refreshMenus(), /temporary/)
  assert.equal(navigation.getState().routes, previous)
  assert.equal(navigation.getState().initialized, false)
  navigation.getState().clearMenus()
  assert.deepEqual(
    navigation.getState().routes.map(route => route.path),
    ['/dashboard', '/help'],
  )
})

test('Navigation highlight follows the native static-route ranking', () => {
  const { menus } = buildMenus([
    {
      path: '/orders',
      children: [
        { name: 'detail', path: ':id' },
        { name: 'new', path: 'new' },
      ],
    },
  ])
  assert.equal(core.findMenuTrail(menus, '/orders/new').at(-1).menu.name, 'new')
})
