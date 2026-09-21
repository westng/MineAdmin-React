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
      "export { default as DictionaryPage } from './src/plugins/mine-admin/dictionary/views/index'",
      "export { useDictionaryTypeStore } from './src/plugins/mine-admin/dictionary/store/dictionary-type'",
      "export { ToastContext } from './src/components/reui/toast-context'",
      "export { setGet } from 'dictionary-test-api'",
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
              : `import { create } from 'zustand'; export const useSessionStore = create(() => ({ permissions: ['dataCenter:dictionary:save', 'dataCenter:dictionary:update', 'dataCenter:dictionary:delete'], roles: [] }))`,
          resolveDir: fileURLToPath(new URL('../', import.meta.url)),
        }))
      },
    },
  ],
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const { DictionaryPage, useDictionaryTypeStore, ToastContext, setGet } = compiled.exports

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
  useDictionaryTypeStore.setState({ types: [], selectedTypeId: null, loading: false })
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
    container.remove()
  })
  await act(async () =>
    root.render(createElement(ToastContext.Provider, { value: context }, createElement(DictionaryPage))),
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

test('字典页面打开、选择、编辑弹窗和切换分类后保留正确的查询参数', async t => {
  const requests = []
  setGet(async (url, { params } = {}) => {
    if (url === '/admin/data_center/dictionary_type/list') return response({ list: types })
    assert.equal(url, '/admin/data_center/dictionary/list')
    requests.push(params)
    return response({ list: [row(params.type_id)], total: 1 })
  })
  const { container, errors } = await mount(t)
  assert.match(container.querySelector('tbody').textContent, /分类1条目/)
  assert.equal(requests.at(-1).type_id, 1)
  await click(container.querySelector('tbody [role="checkbox"]'))
  assert.equal(button(container, '批量删除').disabled, false)
  await click(button(container, '新增字典项'))
  assert.ok(document.querySelector('[role="dialog"]'))
  await click(button(document.querySelector('[role="dialog"]'), '取消'))
  const previousRequestCount = requests.length
  await click(button(container, '刷新'))
  assert.equal(requests.length, previousRequestCount + 1)
  assert.equal(requests.at(-1).type_id, 1)
  assert.match(container.querySelector('tbody').textContent, /分类1条目/)
  const secondType = [...container.querySelectorAll('aside [role="button"]')].find(node =>
    node.textContent.includes('分类二'),
  )
  await click(secondType)
  assert.equal(requests.at(-1).type_id, 2)
  assert.equal(requests.at(-1).page, 1)
  assert.match(container.querySelector('tbody').textContent, /分类2条目/)
  assert.doesNotMatch(container.querySelector('tbody').textContent, /分类1条目/)
  assert.equal(button(container, '批量删除').disabled, true)
  assert.deepEqual(errors, [])
})

test('没有字典分类时保持空状态，不请求字典项接口', async t => {
  const requests = []
  setGet(async url => {
    requests.push(url)
    assert.equal(url, '/admin/data_center/dictionary_type/list')
    return response({ list: [] })
  })
  const { container, errors } = await mount(t)
  assert.match(container.textContent, /请先选择字典类型/)
  assert.equal(button(container, '新增字典项').disabled, true)
  assert.equal(requests.length, 1)
  assert.deepEqual(errors, [])
})
