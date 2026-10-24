import { runtimeExports, createRuntimeFixture } from './fixtures/runtime.mjs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'

const dom = new Window({
  url: 'http://localhost',
  settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true },
})
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLButtonElement',
  'HTMLFormElement',
  'Element',
  'Node',
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
]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
}
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const require = createRequire(import.meta.url)
const { createRoot } = require('react-dom/client')
const result = await build({
  stdin: {
    contents: [
      runtimeExports,
      "export { default as DictionaryPage } from './src/plugins/mine-admin/dictionary/views/index'",
      "export { default as dictionaryPlugin } from './src/plugins/mine-admin/dictionary'",
      "export { ShellSlotOutlet } from './src/layouts/slot-outlet'",
      "export { getDictionaryTypeStore } from './src/plugins/mine-admin/dictionary/store/dictionary-type'",
      "export { setGet, default as http } from 'dictionary-test-api'",
      "export { useSessionStore } from '@/provider/session'",
    ].join('\n'),
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  plugins: [
    {
      name: 'dictionary-test-fixtures',
      setup(build) {
        build.onResolve({ filter: /^(dictionary-test-api|@\/provider\/http)$/ }, () => ({
          path: 'api',
          namespace: 'dictionary-fixture',
        }))
        build.onResolve({ filter: /^@\/provider\/session$/ }, () => ({
          path: 'user',
          namespace: 'dictionary-fixture',
        }))
        build.onLoad({ filter: /.*/, namespace: 'dictionary-fixture' }, ({ path }) => ({
          contents:
            path === 'api'
              ? `let get; export const setGet = handler => { get = handler }; export default { get: (...args) => get(...args) }`
              : `import { create } from 'zustand'; export const useSessionStore = create(() => ({ permissions: ['dataCenter:dictionary:list', 'dataCenter:dictionary:save', 'dataCenter:dictionary:update', 'dataCenter:dictionary:delete', 'dataCenter:dictionary:typeList', 'dataCenter:dictionary:typeSave', 'dataCenter:dictionary:typeUpdate', 'dataCenter:dictionary:typeDelete'], roles: [] }))`,
          resolveDir: fileURLToPath(new URL('../', import.meta.url)),
        }))
      },
    },
  ],
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const {
  DictionaryPage,
  dictionaryPlugin,
  ShellSlotOutlet,
  getDictionaryTypeStore,
  ToastContext,
  RuntimeContext,
  useSessionStore,
  setGet,
} = compiled.exports
const runtimeFixture = createRuntimeFixture(compiled.exports, compiled.exports.http)
const runtime = runtimeFixture.runtime
runtime.session.setState({ permissions: useSessionStore.getState().permissions })

const types = [
  { id: 1, name: '分类一', code: 'first', status: 1 },
  { id: 2, name: '分类二', code: 'second', status: 1 },
]
const row = typeId => ({
  id: typeId * 10,
  type_id: typeId,
  label: `分类${typeId}条目`,
  value: '1',
  code: `item-${typeId}`,
  i18n_scope: 1,
  status: 1,
  sort: 0,
})
const response = data => ({ data: { code: 200, data } })

async function mount(t) {
  getDictionaryTypeStore(runtime).setState({ types: [], selectedTypeId: null, loading: false })
  const disposePlugin = dictionaryPlugin.install(runtime)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const errors = []
  const context = {
    toast: message => {
      errors.push(message)
    },
  }
  t.after(async () => {
    await act(async () => root.unmount())
    disposePlugin()
    runtimeFixture.runtime.dispose()
    container.remove()
  })
  await act(async () =>
    root.render(
      createElement(
        RuntimeContext.Provider,
        { value: runtime },
        createElement(
          ToastContext.Provider,
          { value: context },
          createElement(
            'div',
            null,
            createElement(
              'div',
              { 'data-testid': 'shell-pane' },
              createElement(ShellSlotOutlet, { slot: 'shell.pane', pathname: '/dataCenter/dictionary' }),
            ),
            createElement('div', { 'data-testid': 'dictionary-page' }, createElement(DictionaryPage)),
          ),
        ),
      ),
    ),
  )
  return { container, errors }
}

function button(container, text) {
  return [...container.querySelectorAll('button')].find(
    node => node.textContent.trim() === text || node.getAttribute('aria-label') === text,
  )
}

async function click(element) {
  assert.ok(element, '应找到目标控件')
  await act(async () => element.click())
}

after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

test('字典分类使用 CRUD 表格，并从行操作打开字典项抽屉', async t => {
  const itemRequests = []
  let typeRequests = 0
  setGet(async (url, { params } = {}) => {
    if (url === '/admin/data_center/dictionary_type/list') {
      typeRequests++
      return response({ list: types })
    }
    assert.equal(url, '/admin/data_center/dictionary/list')
    itemRequests.push(params)
    return response({ list: [row(params.type_id)], total: 1 })
  })
  const { container, errors } = await mount(t)
  assert.match(container.textContent, /字典分类/)
  assert.equal(container.querySelectorAll('aside[aria-label="字典分类"]').length, 0)
  assert.equal(container.querySelector('[data-testid="shell-pane"]').children.length, 0)
  assert.equal(typeRequests, 1)
  assert.match(container.querySelector('tbody').textContent, /分类一/)
  assert.ok(button(container, '新增字典分类'))
  assert.equal(button(container, '批量删除').disabled, true)

  await click(button(container, '字典项'))
  const drawer = document.querySelector('[data-slot="sheet-content"]')
  assert.ok(drawer)
  assert.match(drawer.textContent, /字典项 · 分类一/)
  assert.match(drawer.textContent, /分类1条目/)
  assert.equal(itemRequests.at(-1).type_id, 1)

  await click(button(drawer, '新增字典项'))
  const itemDialog = document.querySelector('[data-slot="dialog-content"]')
  assert.ok(itemDialog)
  await click(button(itemDialog, '取消'))
  await click(button(drawer, '关闭'))

  await click(button(container, '刷新'))
  assert.equal(typeRequests, 2)
  assert.deepEqual(errors, [])
})

test('字典分类表格支持选择和空状态，不请求字典项接口', async t => {
  const requests = []
  setGet(async url => {
    requests.push(url)
    assert.equal(url, '/admin/data_center/dictionary_type/list')
    return response({ list: [] })
  })
  const { container, errors } = await mount(t)
  assert.match(container.textContent, /暂无字典分类/)
  assert.ok(button(container, '新增字典分类'))
  assert.equal(requests.length, 1)
  assert.deepEqual(errors, [])
})

test('字典项表格仍支持选择和编辑入口', async t => {
  const requests = []
  setGet(async (url, { params } = {}) => {
    if (url === '/admin/data_center/dictionary_type/list') return response({ list: types })
    assert.equal(url, '/admin/data_center/dictionary/list')
    requests.push(params)
    return response({ list: [row(params.type_id)], total: 1 })
  })
  const { container, errors } = await mount(t)
  await click(button(container, '字典项'))
  const drawer = document.querySelector('[data-slot="sheet-content"]')
  assert.ok(drawer)
  await click(drawer.querySelector('tbody [role="checkbox"]'))
  assert.equal(button(drawer, '批量删除').disabled, false)
  await click(button(drawer, '编辑'))
  assert.ok(document.querySelector('[data-slot="dialog-content"]'))
  assert.deepEqual(errors, [])
})

test('字典分类加载骨架和完整列表均按 20 条分页，翻页清除旧选择', async t => {
  const manyTypes = Array.from({ length: 45 }, (_, index) => ({
    id: index + 1,
    name: `分类-${index + 1}`,
    code: `type-${index + 1}`,
    status: 1,
  }))
  let resolveTypes
  const pendingTypes = new Promise(resolve => {
    resolveTypes = resolve
  })
  t.after(() => resolveTypes(response(manyTypes)))
  let requests = 0
  setGet(async (url, { params } = {}) => {
    assert.equal(url, '/admin/data_center/dictionary_type/list')
    assert.deepEqual(params, {})
    requests++
    return pendingTypes
  })

  const { container, errors } = await mount(t)
  assert.equal(container.querySelectorAll('tbody > tr').length, 20, '等待响应时只应挂载一页骨架')
  await act(async () => resolveTypes(response(manyTypes)))

  const visibleCodes = () => [...container.querySelectorAll('tbody code')].map(node => node.textContent)
  assert.deepEqual(
    visibleCodes(),
    manyTypes.slice(0, 20).map(type => type.code),
  )
  await click(container.querySelector('tbody [role="checkbox"]'))
  assert.equal(button(container, '批量删除').disabled, false)

  await click(button(container, '下一页'))
  assert.deepEqual(
    visibleCodes(),
    manyTypes.slice(20, 40).map(type => type.code),
  )
  assert.equal(button(container, '批量删除').disabled, true)
  await click(button(container, '下一页'))
  assert.deepEqual(
    visibleCodes(),
    manyTypes.slice(40).map(type => type.code),
  )
  assert.equal(button(container, '下一页').disabled, true)
  assert.equal(requests, 3)
  assert.deepEqual(errors, [])
})

test('关闭字典项抽屉会取消未完成请求，迟到响应不会保留表格', async t => {
  let itemSignal
  let resolveItems
  const pendingItems = new Promise(resolve => {
    resolveItems = resolve
  })
  t.after(() => resolveItems(response({ list: [row(1)], total: 1 })))
  setGet(async (url, { signal } = {}) => {
    if (url === '/admin/data_center/dictionary_type/list') return response(types)
    assert.equal(url, '/admin/data_center/dictionary/list')
    itemSignal = signal
    return pendingItems
  })

  const { container, errors } = await mount(t)
  await click(button(container, '字典项'))
  const drawer = document.querySelector('[data-slot="sheet-content"]')
  assert.ok(drawer.querySelector('table'))
  assert.equal(itemSignal?.aborted, false)
  await click(button(drawer, '关闭'))
  assert.equal(itemSignal.aborted, true)
  assert.equal(drawer.querySelector('table'), null)
  await act(async () => resolveItems(response({ list: [row(1)], total: 1 })))
  assert.equal(document.querySelectorAll('table').length, 1)
  assert.deepEqual(errors, [])
})

test('Dictionary selection is isolated by runtime and session, including late responses', () => {
  const first = createRuntimeFixture(compiled.exports, compiled.exports.http).runtime
  const second = createRuntimeFixture(compiled.exports, compiled.exports.http).runtime
  try {
    const oldStore = getDictionaryTypeStore(first)
    oldStore.getState().setTypes([{ id: 7, name: 'first', code: 'first', status: 1 }])
    assert.equal(getDictionaryTypeStore(second).getState().selectedTypeId, null)
    first.session.setState({ sessionVersion: first.session.getState().sessionVersion + 1 })
    const nextStore = getDictionaryTypeStore(first)
    oldStore.getState().setTypes([{ id: 8, name: 'late', code: 'late', status: 1 }])
    assert.notEqual(nextStore, oldStore)
    assert.deepEqual(nextStore.getState().types, [])
    assert.equal(nextStore.getState().selectedTypeId, null)
  } finally {
    first.dispose()
    second.dispose()
  }
})
