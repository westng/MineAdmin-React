import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
const require = createRequire(new URL('../package.json', import.meta.url))
const { build } = await import(require.resolve('esbuild'))
const { Window } = await import(require.resolve('happy-dom'))
const window = new Window({ url: 'http://localhost/' })
for (const key of [
  'window',
  'document',
  'navigator',
  'localStorage',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'ResizeObserver',
  'DOMRect',
  'ShadowRoot',
  'DocumentFragment',
  'HTMLInputElement',
  'HTMLButtonElement',
]) {
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true })
}
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = require('react')
const { act } = React
const { createRoot } = require('react-dom/client')
const { MemoryRouter, HashRouter, BrowserRouter, Routes, Route } = require('react-router-dom')
const result = await build({
  stdin: {
    contents: `
      export { createAppRuntime } from './src/app/runtime/create-runtime'
      export { createBuiltinLayouts } from './src/layouts/builtins'
      export { AppProviders } from './src/provider/app-provider'
      export { AppRouter } from './src/router'
      export { default as AppLayout } from './src/layouts'
      export { AiAgentsComposer } from './src/layouts/components/ai-agents'
      export { default as shellLocale } from './src/layouts/locales/ui'
      export { registerLocaleBundles } from './src/services/i18n/discovery'
      export { menuToRoutes } from './src/router/dynamic-routes'
    `,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
  define: {
    'import.meta.env': '{"VITE_APP_STORAGE_PREFIX":"dom_","VITE_APP_TITLE":"MineAdmin"}',
    'import.meta.hot': 'undefined',
    'import.meta.url': '""',
  },
  plugins: [
    {
      name: 'icons-assets',
      setup(builder) {
        builder.onResolve({ filter: /^@\/utils\/icons$/ }, () => ({ path: 'icons', namespace: 'icons' }))
        builder.onLoad({ filter: /.*/, namespace: 'icons' }, () => ({
          contents: 'export const customIconUrls = {}; export const normalizeIconName = value => value || "";',
        }))
      },
    },
  ],
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const core = module.exports
const roots = []
let currentRuntime
const disposers = []
afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount()
  })
  disposers
    .splice(0)
    .reverse()
    .forEach(dispose => dispose())
  currentRuntime?.dispose()
  currentRuntime = undefined
  document.body.replaceChildren()
  window.happyDOM.setWindowSize({ width: 1024, height: 768 })
})
after(async () => {
  await window.happyDOM.abort()
  window.close()
})
async function mount(element) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(React.createElement(core.AppProviders, { runtime: currentRuntime }, element)))
  return container
}

function makeRuntime({ layout = 'classic', locale = 'zh_CN' } = {}) {
  const memory = new Map()
  const storage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key),
  }
  const runtime = core.createAppRuntime({ storage, prefix: 'shell-review_', layouts: core.createBuiltinLayouts() })
  currentRuntime = runtime
  runtime.settings.getState().setSettings({ app: { ...runtime.settings.getState().settings.app, layout } })
  runtime.session.setState({
    token: 'synthetic-token',
    initialized: true,
    userInfo: { id: 1, username: 'synthetic' },
    roles: ['SuperAdmin'],
    permissions: ['*'],
  })
  disposers.push(core.registerLocaleBundles(runtime.locales, { shell: { default: core.shellLocale } }))
  disposers.push(
    runtime.locales.register({
      id: 'review:en',
      locale: 'en_US',
      namespace: 'app',
      messages: { 'review.reports': 'Reports' },
    }),
  )
  disposers.push(
    runtime.locales.register({
      id: 'review:tw',
      locale: 'zh_TW',
      namespace: 'app',
      messages: { 'review.reports': '報表' },
    }),
  )
  runtime.i18n.store.getState().setLocale(locale)
  const descriptor = {
    name: 'review:reports',
    path: '/reports',
    meta: { type: 'M', title: '报表', i18n: 'review.reports' },
  }
  const result = core.menuToRoutes(
    [descriptor],
    [{ name: 'review:reports', path: '/reports', element: React.createElement('p', null, 'Synthetic report content') }],
  )
  runtime.navigation.setState({ ...result, initialized: true })
  return runtime
}

function layoutPage(page = React.createElement('p', { id: 'synthetic-page' }, 'Synthetic report content')) {
  return React.createElement(
    MemoryRouter,
    { initialEntries: ['/reports'] },
    React.createElement(
      Routes,
      null,
      React.createElement(
        Route,
        { element: React.createElement(core.AppLayout) },
        React.createElement(Route, {
          path: '*',
          element: page,
        }),
      ),
    ),
  )
}

async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 30))
  })
}

for (const layout of ['classic', 'columns'])
  test(`${layout} translates shell controls and menus across three locales without remounting content`, async () => {
    const runtime = makeRuntime({ layout, locale: 'en_US' })
    const container = await mount(layoutPage())
    await settle()
    const page = container.querySelector('#synthetic-page')
    for (const [locale, notify, search, report] of [
      ['en_US', 'Notifications', 'Search menus', 'Reports'],
      ['zh_TW', '通知', '搜尋選單', '報表'],
      ['zh_CN', '通知', '搜索菜单', '报表'],
    ]) {
      await act(async () => runtime.i18n.store.getState().setLocale(locale))
      assert.equal(container.querySelector('[data-slot="notifications-trigger"]').getAttribute('aria-label'), notify)
      assert.ok(container.querySelector(`button[aria-label="${search}"]`), container.textContent)
      assert.match(container.querySelector('header').textContent, new RegExp(report))
      const menu = container.querySelector('a[data-sidebar="menu-button"][href="/reports"]')
      assert.ok(menu)
      assert.equal(layout === 'columns' ? menu.getAttribute('aria-label') : menu.textContent.trim(), report)
      assert.equal(container.querySelector('#synthetic-page'), page)
    }
  })
test('missing menu translation falls back to its readable title', async () => {
  const runtime = makeRuntime({ locale: 'en_US' })
  const result = core.menuToRoutes(
    [
      {
        name: 'fallback',
        path: '/reports',
        meta: { type: 'M', title: 'Readable fallback', i18n: 'missing.synthetic' },
      },
    ],
    [{ name: 'fallback', path: '/reports', element: React.createElement('p', null, 'content') }],
  )
  runtime.navigation.setState({ ...result, initialized: true })
  const container = await mount(layoutPage())
  assert.equal(
    container.querySelector('a[data-sidebar="menu-button"][href="/reports"]').textContent.trim(),
    'Readable fallback',
  )
})
test('classic menu shortcut opens once and cleans up when switching layout', async () => {
  const runtime = makeRuntime()
  const container = await mount(layoutPage())
  await settle()
  const key = async options =>
    act(async () =>
      window.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true, ...options }),
      ),
    )
  await key({ metaKey: true })
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1)
  await key({ metaKey: true, repeat: true })
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1)
  await key({ ctrlKey: true })
  assert.equal(document.querySelector('[role="dialog"]'), null)
  await act(async () => container.querySelector('#search').click())
  assert.ok(document.querySelector('[role="dialog"]'))
  await act(async () =>
    runtime.settings
      .getState()
      .setSettings({ app: { ...runtime.settings.getState().settings.app, layout: 'columns' } }),
  )
  await key({ ctrlKey: true })
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1)
  await act(async () =>
    runtime.settings
      .getState()
      .setSettings({ app: { ...runtime.settings.getState().settings.app, layout: 'classic' } }),
  )
  await key({ metaKey: true })
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1)
})
for (const target of ['/uc/account', '/reports'])
  test(`classic mobile drawer closes after choosing ${target}`, async () => {
    window.happyDOM.setWindowSize({ width: 390, height: 844 })
    makeRuntime()
    const container = await mount(layoutPage())
    await settle()
    await act(async () => container.querySelector('button[aria-label="打开导航菜单"]').click())
    const dialog = document.querySelector('[role="dialog"]')
    assert.ok(dialog)
    const link = dialog.querySelector(`a[href="${target}"]`)
    assert.ok(link)
    await act(async () =>
      link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 0 })),
    )
    await settle()
    assert.equal(document.querySelector('[role="dialog"]'), null)
  })
for (const [mode, Router] of [
  ['hash', HashRouter],
  ['history', BrowserRouter],
]) {
  for (const layout of ['classic', 'columns'])
    test(`${layout} skip-content focuses main and preserves ${mode} URL`, async () => {
      makeRuntime({ layout })
      window.history.replaceState(null, '', mode === 'hash' ? '/#/reports' : '/reports')
      const container = await mount(
        React.createElement(
          Router,
          null,
          React.createElement(
            Routes,
            null,
            React.createElement(
              Route,
              { element: React.createElement(core.AppLayout) },
              React.createElement(Route, {
                path: '*',
                element: React.createElement('p', null, 'Synthetic report content'),
              }),
            ),
          ),
        ),
      )
      await settle()
      const previous = window.location.href
      const link = container.querySelector('a[href="#main-content"]')
      await act(async () => link.click())
      await settle()
      assert.equal(window.location.href, previous)
      assert.equal(document.activeElement, container.querySelector('main#main-content'))
      assert.match(container.textContent, /Synthetic report content/)
    })
}

for (const layout of ['classic', 'columns']) {
  test(`${layout} toggles AI Agents at the right edge without resetting the page`, async () => {
    const runtime = makeRuntime({ layout })
    const container = await mount(
      layoutPage(React.createElement('input', { id: 'synthetic-page', defaultValue: 'draft' })),
    )
    const page = container.querySelector('#synthetic-page')
    page.value = 'unsaved edits'
    const trigger = container.querySelector('[data-slot="ai-agents-trigger"]')
    const panel = () => container.querySelector('[data-slot="ai-agents-panel"]')
    assert.equal([...container.querySelector('header').querySelectorAll('button')].at(-1), trigger)
    assert.equal(trigger.getAttribute('aria-expanded'), 'false')
    assert.equal(panel(), null)

    await act(async () => trigger.click())
    assert.equal(trigger.getAttribute('aria-expanded'), 'true')
    assert.equal(trigger.getAttribute('aria-controls'), panel().id)
    assert.equal(panel().tagName, 'ASIDE')
    assert.equal(panel().previousElementSibling.contains(page), true)
    assert.equal(container.querySelector('#main-content').contains(panel()), false)
    assert.equal(panel().parentElement.lastElementChild, panel())
    assert.ok(panel().querySelector('[data-slot="ai-agents-composer"] textarea'))
    assert.equal(panel().querySelector('button[type="submit"]').disabled, true)
    const thinking = [...panel().querySelectorAll('button')].find(button => button.textContent.trim() === '思考')
    const search = [...panel().querySelectorAll('button')].find(button => button.textContent.trim() === '搜索')
    assert.equal(thinking.getAttribute('aria-pressed'), 'true')
    await act(async () => thinking.click())
    assert.equal(thinking.getAttribute('aria-pressed'), 'false')
    await act(async () => search.click())
    assert.equal(search.getAttribute('aria-pressed'), 'true')
    assert.equal(panel().querySelector('button[aria-label="添加附件"]').disabled, true)
    assert.equal(panel().querySelector('button[aria-label="语音输入"]').disabled, true)

    for (const [locale, hide, empty] of [
      ['en_US', 'Hide AI Agents', 'No AI agents available'],
      ['zh_TW', '隱藏 AI Agents', '暫無可用的 AI Agent'],
      ['zh_CN', '隐藏 AI Agents', '暂无可用的 AI Agent'],
    ]) {
      await act(async () => runtime.i18n.store.getState().setLocale(locale))
      assert.equal(trigger.getAttribute('aria-label'), hide)
      assert.ok(panel().textContent.includes(empty))
    }

    await act(async () => trigger.click())
    assert.equal(panel(), null)
    await act(async () => trigger.click())
    const close = panel().querySelector('button')
    await act(async () => close.click())
    assert.equal(panel(), null)
    assert.equal(document.activeElement, trigger)

    await act(async () => trigger.click())
    await act(async () =>
      panel()
        .querySelector('button')
        .dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })),
    )
    assert.equal(panel(), null)
    assert.equal(trigger.getAttribute('aria-expanded'), 'false')
    assert.equal(document.activeElement, trigger)
    assert.equal(container.querySelector('#synthetic-page'), page)
    assert.equal(page.value, 'unsaved edits')
  })

  test(`${layout} mounts AI Agents extensions on demand with the current user and path`, async () => {
    const runtime = makeRuntime({ layout })
    let active = 0
    function Agent({ pathname, userId }) {
      React.useEffect(() => {
        active += 1
        return () => {
          active -= 1
        }
      }, [])
      return React.createElement('p', { 'data-agent-extension': '' }, `${userId}:${pathname}`)
    }
    const dispose = runtime.slots.register({
      id: 'test.ai-agents',
      slot: 'shell.ai-agents',
      component: Agent,
    })
    disposers.push(dispose)
    const container = await mount(layoutPage())
    const trigger = container.querySelector('[data-slot="ai-agents-trigger"]')
    assert.equal(active, 0)
    await act(async () => trigger.click())
    assert.equal(active, 1)
    assert.equal(container.querySelector('[data-agent-extension]').textContent, '1:/reports')
    assert.doesNotMatch(container.querySelector('[data-slot="ai-agents-content"]').textContent, /暂无可用/)
    assert.equal(container.querySelector('[data-slot="ai-agents-composer"]'), null)

    await act(async () => trigger.click())
    assert.equal(active, 0)
    await act(async () => trigger.click())
    assert.equal(active, 1)
    await act(async () => dispose())
    assert.equal(active, 0)
    assert.match(container.querySelector('[data-slot="ai-agents-content"]').textContent, /暂无可用的 AI Agent/)
  })

  test(`${layout} uses a dismissible mobile AI Agents drawer and restores focus`, async () => {
    window.happyDOM.setWindowSize({ width: 390, height: 844 })
    makeRuntime({ layout })
    const container = await mount(layoutPage())
    const page = container.querySelector('#synthetic-page')
    const trigger = container.querySelector('[data-slot="ai-agents-trigger"]')
    await act(async () => {
      trigger.focus()
      trigger.click()
    })
    await settle()
    const drawer = document.getElementById(trigger.getAttribute('aria-controls'))
    assert.ok(drawer)
    assert.equal(drawer.getAttribute('role'), 'dialog')
    assert.equal(drawer.id, trigger.getAttribute('aria-controls'))
    assert.equal(container.querySelector('aside[data-slot="ai-agents-panel"]'), null)
    assert.match(drawer.textContent, /AI Agents/)
    assert.match(drawer.textContent, /暂无可用的 AI Agent/)
    assert.ok(drawer.querySelector('[data-slot="ai-agents-composer"] textarea'))
    assert.equal(drawer.querySelector('[data-slot="sheet-footer"]'), null)
    assert.equal(drawer.querySelector('[data-slot="ai-agents-resize-handle"]'), null)

    await act(async () => drawer.querySelector('[data-slot="sheet-close"]').click())
    await settle()
    assert.equal(trigger.getAttribute('aria-expanded'), 'false')
    assert.equal(document.activeElement, trigger)
    await act(async () => trigger.click())
    await settle()
    await act(async () =>
      document
        .querySelector('[role="dialog"]')
        .dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })),
    )
    await settle()
    assert.equal(trigger.getAttribute('aria-expanded'), 'false')
    assert.equal(document.activeElement, trigger)
    assert.equal(container.querySelector('#synthetic-page'), page)
  })
}

async function panelPointer(target, type, options = {}) {
  await act(async () =>
    target.dispatchEvent(
      new window.PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        isPrimary: true,
        button: 0,
        clientX: 600,
        ...options,
      }),
    ),
  )
}

for (const layout of ['classic', 'columns']) {
  test(`${layout} resizes the AI pane within the content space and preserves both input areas`, async () => {
    makeRuntime({ layout })
    const container = await mount(
      layoutPage(React.createElement('input', { id: 'synthetic-page', defaultValue: 'page draft' })),
    )
    await act(async () => container.querySelector('[data-slot="ai-agents-trigger"]').click())
    const panel = container.querySelector('[data-slot="ai-agents-panel"]')
    const handle = panel.querySelector('[data-slot="ai-agents-resize-handle"]')
    const page = container.querySelector('#synthetic-page')
    const composer = panel.querySelector('textarea')
    let availableWidth = 960
    const width = () => Number.parseFloat(panel.style.width) || 320
    // Happy DOM 不进行排版；只替代宽度测量，指针和键盘均走实际事件。
    panel.getBoundingClientRect = () => new window.DOMRect(availableWidth - width(), 50, width(), 700)
    panel.previousElementSibling.getBoundingClientRect = () => new window.DOMRect(0, 50, availableWidth - width(), 700)
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(composer, 'AI draft')
      composer.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    assert.equal(handle.getAttribute('role'), 'separator')
    assert.equal(handle.getAttribute('aria-orientation'), 'vertical')
    assert.equal(handle.getAttribute('aria-controls'), panel.id)
    assert.equal(handle.hasAttribute('data-resizing'), false)
    await panelPointer(handle, 'pointerdown')
    assert.equal(handle.hasAttribute('data-resizing'), true)
    await panelPointer(document, 'pointermove', { clientX: 500 })
    assert.equal(panel.style.width, '420px')
    await panelPointer(document, 'pointerup')
    assert.equal(handle.hasAttribute('data-resizing'), false)
    assert.equal(handle.getAttribute('aria-valuenow'), '420')

    const key = (key, options = {}) =>
      act(async () =>
        handle.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })),
      )
    await key('ArrowLeft')
    assert.equal(panel.style.width, '436px')
    await key('ArrowRight', { shiftKey: true })
    assert.equal(panel.style.width, '372px')
    await key('Home')
    assert.equal(panel.style.width, '320px')
    await key('End')
    assert.equal(panel.style.width, '640px')
    availableWidth = 800
    await act(async () => window.dispatchEvent(new window.Event('resize')))
    assert.equal(panel.style.width, '480px')
    assert.equal(handle.getAttribute('aria-valuemax'), '480')
    await panelPointer(handle, 'pointerdown')
    await panelPointer(document, 'pointermove', { clientX: -10000 })
    assert.equal(panel.style.width, '480px')
    await panelPointer(document, 'pointermove', { clientX: 10000 })
    assert.equal(panel.style.width, '320px')
    await panelPointer(document, 'pointerup')
    await act(async () => handle.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true })))
    assert.equal(panel.style.width, '')
    assert.equal(container.querySelector('#synthetic-page'), page)
    assert.equal(page.value, 'page draft')
    assert.equal(panel.querySelector('textarea'), composer)
    assert.equal(composer.value, 'AI draft')
  })

  test(`${layout} releases the AI separator press state and document styles on cancel, blur and close`, async t => {
    makeRuntime({ layout })
    const container = await mount(layoutPage())
    const trigger = container.querySelector('[data-slot="ai-agents-trigger"]')
    await act(async () => trigger.click())
    const panel = container.querySelector('[data-slot="ai-agents-panel"]')
    const handle = panel.querySelector('[data-slot="ai-agents-resize-handle"]')
    const cursor = document.body.style.cursor
    const userSelect = document.body.style.userSelect
    document.body.style.cursor = 'crosshair'
    document.body.style.userSelect = 'text'
    t.after(() => {
      document.body.style.cursor = cursor
      document.body.style.userSelect = userSelect
    })
    await panelPointer(handle, 'pointerdown', { button: 2 })
    await panelPointer(handle, 'pointerdown', { isPrimary: false })
    assert.equal(handle.hasAttribute('data-resizing'), false)

    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) {
      await panelPointer(handle, 'pointerdown')
      assert.equal(handle.hasAttribute('data-resizing'), true)
      assert.equal(document.body.style.cursor, 'col-resize')
      await panelPointer(document, 'pointerup', { pointerId: 2 })
      assert.equal(handle.hasAttribute('data-resizing'), true)
      if (event === 'blur') await act(async () => window.dispatchEvent(new window.Event('blur')))
      else await panelPointer(event === 'lostpointercapture' ? handle : document, event)
      assert.equal(handle.hasAttribute('data-resizing'), false)
      assert.equal(document.body.style.cursor, 'crosshair')
      assert.equal(document.body.style.userSelect, 'text')
    }
    await panelPointer(handle, 'pointerdown')
    await act(async () => trigger.click())
    assert.equal(container.querySelector('[data-slot="ai-agents-panel"]'), null)
    assert.equal(document.body.style.cursor, 'crosshair')
    assert.equal(document.body.style.userSelect, 'text')
    await panelPointer(document, 'pointermove', { clientX: 400 })
    await act(async () => trigger.click())
    assert.equal(container.querySelector('[data-slot="ai-agents-panel"]').style.width, '')
    assert.equal(container.querySelector('[data-slot="ai-agents-resize-handle"]').hasAttribute('data-resizing'), false)
  })
}

test('AI composer works without a Runtime and respects IME, multiline input and controlled drafts', async () => {
  const sent = []
  function Example() {
    const [value, setValue] = React.useState('')
    return React.createElement(core.AiAgentsComposer, {
      value,
      onValueChange: setValue,
      onSend: text => sent.push(text),
    })
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(React.createElement(Example)))
  const input = container.querySelector('textarea')
  const send = container.querySelector('button[type="submit"]')
  const fill = async value =>
    act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
  const key = async options => {
    const event = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options })
    await act(async () => input.dispatchEvent(event))
    return event
  }

  assert.equal(send.disabled, true)
  await fill('  \n ')
  await key()
  assert.deepEqual(sent, [])
  await fill('  你好\n世界  ')
  assert.equal(send.disabled, false)
  assert.equal((await key({ shiftKey: true })).defaultPrevented, false)
  assert.equal((await key({ isComposing: true })).defaultPrevented, false)
  assert.equal((await key({ keyCode: 229 })).defaultPrevented, false)
  await key({ repeat: true })
  assert.deepEqual(sent, [])
  assert.equal((await key()).defaultPrevented, true)
  assert.deepEqual(sent, ['你好\n世界'])
  assert.equal(input.value, '  你好\n世界  ', 'the consumer decides when to clear the draft')
  await act(async () => send.click())
  assert.deepEqual(sent, ['你好\n世界', '你好\n世界'])
})

test('AI composer blocks submission without a handler, while disabled and while pending', async () => {
  const sent = []
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  const render = async options =>
    act(async () =>
      root.render(
        React.createElement(core.AiAgentsComposer, {
          value: 'draft',
          onValueChange: () => undefined,
          onSend: text => sent.push(text),
          ...options,
        }),
      ),
    )
  for (const options of [{ onSend: undefined }, { disabled: true }, { pending: true }]) {
    await render(options)
    assert.equal(container.querySelector('button[type="submit"]').disabled, true)
    assert.equal(container.querySelector('textarea').disabled, Boolean(options.disabled || options.pending))
    await act(async () =>
      container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })),
    )
    assert.deepEqual(sent, [])
  }
  assert.equal(container.querySelector('form').getAttribute('aria-busy'), 'true')
  await render({})
  await act(async () => container.querySelector('button[type="submit"]').click())
  assert.deepEqual(sent, ['draft'])
})

test('AI composer supports status, notice and toolbar content without submitting their actions', async () => {
  const sent = []
  let actionClicks = 0
  function Example() {
    const [statusVisible, setStatusVisible] = React.useState(true)
    return React.createElement(core.AiAgentsComposer, {
      value: 'draft',
      onValueChange: () => undefined,
      onSend: text => sent.push(text),
      notice: React.createElement('p', null, 'Custom notice'),
      status: statusVisible ? 'Custom status' : undefined,
      onDismissStatus: () => setStatusVisible(false),
      actions: React.createElement('button', { type: 'button', onClick: () => actionClicks++ }, 'Custom action'),
      trailingActions: React.createElement('span', null, 'Custom tool count'),
      footer: 'Custom footer',
    })
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(React.createElement(Example)))
  assert.equal(container.querySelector('[data-slot="ai-agents-composer-notice"]').textContent, 'Custom notice')
  assert.match(container.querySelector('[data-slot="ai-agents-composer-status"]').textContent, /Custom status/)
  assert.equal(container.querySelector('[data-slot="ai-agents-composer-footer"]').textContent, 'Custom footer')
  assert.match(container.textContent, /Custom tool count/)
  await act(async () => container.querySelector('[data-slot="ai-agents-composer-actions"] button').click())
  assert.equal(actionClicks, 1)
  await act(async () => container.querySelector('[aria-label="关闭状态提示"]').click())
  assert.equal(container.querySelector('[data-slot="ai-agents-composer-status"]'), null)
  assert.deepEqual(sent, [])
  assert.equal(container.querySelector('textarea').value, 'draft')
})
