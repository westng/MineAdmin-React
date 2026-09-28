import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, readFileSync, cpSync, existsSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createServer } from 'vite'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'
import { publicSource, projectRoot } from '../scripts/public-files.mjs'

test('Public-only checkout renders real user management, defaults and all plugin route sources', async () => {
  const source = publicSource({ workingTree: true })
  const destination = mkdtempSync(path.join(os.tmpdir(), 'mineadmin-public-routing-'))
  const originalDirectory = process.cwd()
  const dom = new Window({
    url: 'http://localhost/',
    settings: { disableIframePageLoading: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
  })
  for (const key of [
    'window',
    'document',
    'navigator',
    'localStorage',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLButtonElement',
    'HTMLFormElement',
    'HTMLSelectElement',
    'HTMLTextAreaElement',
    'Element',
    'Node',
    'NodeFilter',
    'DocumentFragment',
    'MutationObserver',
    'ResizeObserver',
    'Event',
    'MouseEvent',
    'KeyboardEvent',
    'PointerEvent',
    'FocusEvent',
    'CustomEvent',
    'DOMRect',
    'ShadowRoot',
  ])
    Object.defineProperty(globalThis, key, { value: key === 'window' ? dom : dom[key], configurable: true })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
  globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
  globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
  const { createRoot } = await import('react-dom/client')
  const roots = []
  let server, runtime, dispose
  try {
    for (const file of source.files) {
      const target = path.join(destination, file)
      mkdirSync(path.dirname(target), { recursive: true })
      writeFileSync(target, source.read(file))
    }
    assert.equal(existsSync(path.join(destination, 'src/app/application.tsx')), false)
    assert.equal(existsSync(path.join(destination, '.env')), false)
    assert.equal(existsSync(path.join(destination, 'src/plugins/west')), false)
    symlinkSync(path.join(projectRoot, 'node_modules'), path.join(destination, 'node_modules'), 'dir')
    writeFileSync(
      path.join(destination, 'src/route-probe.tsx'),
      `
      import React from 'react'
      import { MemoryRouter } from 'react-router-dom'
      import { AppProviders } from './provider'
      import { PageViewport } from './router/page-viewport'
      import { AppRouter } from './router'
      import { runtime } from './app/runtime/instance'
      export { runtime }
      export { bootstrap } from './app/bootstrap'
      export function Page({ pathname }) {
        if (pathname === '/permission/user') return <AppProviders runtime={runtime}><AppRouter /></AppProviders>
        return <AppProviders runtime={runtime}><MemoryRouter initialEntries={[pathname]}><PageViewport routes={runtime.navigation.getState().routes} /></MemoryRouter></AppProviders>
      }
    `,
    )
    process.chdir(destination)
    for (const installed of [false, true]) {
      if (installed) {
        cpSync(
          path.join(destination, 'examples/routing/module'),
          path.join(destination, 'src/modules/example/report'),
          { recursive: true },
        )
        cpSync(
          path.join(destination, 'examples/routing/plugin'),
          path.join(destination, 'src/plugins/example/report'),
          { recursive: true },
        )
      }
      server = await createServer({
        mode: 'test',
        root: destination,
        cacheDir: path.join(destination, `.cache-${installed}`),
        server: { middlewareMode: true, hmr: false, open: false },
        appType: 'custom',
        logLevel: 'error',
        define: {
          'import.meta.env.VITE_APP_ROUTE_MODE': JSON.stringify('hash'),
          'import.meta.env.VITE_APP_ROOT_BASE': JSON.stringify('/'),
        },
      })
      const probe = await server.ssrLoadModule('/src/route-probe.tsx')
      runtime = probe.runtime
      runtime.http.defaults.adapter = async config => {
        throw new Error(`Unexpected network access during public bootstrap: ${config.method}`)
      }
      dispose = await probe.bootstrap()
      assert.equal(runtime.plugins.list().length, installed ? 1 : 0)
      assert.ok(runtime.views.has('base/user/views/index', 'modules/'))
      assert.equal(runtime.views.has('base/views/permission/user/index', 'modules/'), false)
      await runtime.session
        .getState()
        .loginWithTokens(
          { access_token: 'synthetic', refresh_token: 'synthetic-refresh', expire_at: 3600 },
          { username: 'reader' },
        )
      runtime.session.setState({
        token: 'synthetic',
        initialized: true,
        userInfo: { username: 'reader' },
        permissions: ['*'],
        roles: [],
      })
      const menus = installed
        ? JSON.parse(readFileSync(path.join(destination, 'examples/routing/menus.json'), 'utf8'))
        : [
            {
              name: 'home',
              path: '/',
              component: 'base/dashboard/views/index',
              meta: { title: '首页', componentPath: 'modules/' },
            },
            {
              name: 'permission:user',
              path: '/permission/user',
              component: 'base/user/views/index',
              meta: { title: '用户管理', componentPath: 'modules/' },
            },
          ]
      runtime.http.defaults.adapter = async config => {
        assert.equal(config.method, 'get', 'Acceptance fixtures only allow reads')
        let data
        if (config.url === '/admin/permission/menus') data = menus
        else if (config.url === '/admin/passport/getInfo') data = { id: 1, username: 'reader', nickname: '验收账号' }
        else if (config.url === '/admin/permission/roles') data = [{ code: 'SuperAdmin' }]
        else if (config.url === '/admin/user/list')
          data = {
            list: [
              { id: 7, username: 'acceptance-user', nickname: '路由验收用户', status: 1, user_type: 100, roles: [] },
            ],
            total: 1,
          }
        else if (config.url.startsWith('/admin/department/list') || config.url.startsWith('/admin/position/list'))
          data = { list: [], total: 0 }
        else throw new Error(`Unexpected fixture request: ${config.url}`)
        return {
          config,
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { code: 200, data },
        }
      }
      await runtime.navigation.getState().refreshMenus()
      const cases = installed
        ? [
            ['/examples/module', '模块动态页面'],
            ['/examples/plugin', '插件动态页面'],
            ['/examples/help', '插件静态页面'],
          ]
        : [
            ['/dashboard', '暂无工作台内容'],
            ['/permission/user', '路由验收用户'],
          ]
      for (const [pathname, expected] of cases) {
        dom.history.replaceState({}, '', `/#${pathname}`)
        if (pathname === '/permission/user')
          runtime.session.setState({ initialized: false, permissions: [], roles: [] })
        const node = document.createElement('div')
        document.body.append(node)
        const root = createRoot(node)
        roots.push(root)
        await act(async () => root.render(createElement(probe.Page, { pathname })))
        // Vite resolves lazy modules asynchronously through its SSR loader.
        for (let attempt = 0; attempt < 200 && !node.textContent.includes(expected); attempt++)
          await act(async () => new Promise(resolve => setTimeout(resolve, 25)))
        assert.ok(node.textContent.includes(expected), `${pathname}: ${node.textContent.slice(0, 180)}`)
        await act(async () => roots.pop().unmount())
        node.remove()
      }
      dispose()
      dispose = undefined
      runtime.dispose()
      runtime = undefined
      await server.close()
      server = undefined
      localStorage.clear()
    }
  } finally {
    await act(async () => {
      for (const root of roots) root.unmount()
    })
    dispose?.()
    runtime?.dispose()
    await server?.close()
    process.chdir(originalDirectory)
    await dom.happyDOM.abort()
    dom.close()
    rmSync(destination, { recursive: true, force: true })
  }
})
