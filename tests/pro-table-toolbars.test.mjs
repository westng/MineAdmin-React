import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { after, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement, createRef } from 'react'

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
const calls = []
const http = {
  async post(url, body, config) {
    calls.push({ url, body, config })
    if (url.endsWith('/exportFields')) return { data: { data: [{ key: 'aweme_name', label: '达人昵称' }] } }
    if (config?.responseType === 'blob') return { data: new Blob(['fixture']) }
    return { data: { code: 200, data: { id: 1 } } }
  },
}
const hasImportExport = existsSync(new URL('../src/plugins/west/importExportPro/index.ts', import.meta.url))
const result = await build({
  stdin: {
    contents: [
      "export * from './src/components/ma-pro-table'",
      hasImportExport
        ? "export { default as plugin } from './src/plugins/west/importExportPro'"
        : 'export const plugin = null',
      "export { ToastContext } from './src/components/reui/toast-context'",
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
      name: 'toolbar-fixtures',
      setup(build) {
        build.onResolve({ filter: /^@\/provider\/http$/ }, () => ({ path: 'http', namespace: 'fixture' }))
        build.onResolve({ filter: /^\.\/views\/ImportExportTaskPage$/ }, () => ({
          path: 'task-page',
          namespace: 'fixture',
        }))
        build.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
          contents:
            path === 'http'
              ? 'export default __toolbarHttpFixture'
              : 'export default function TaskPage() { return null }',
        }))
      },
    },
  ],
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', '__toolbarHttpFixture', result.outputFiles[0].text)(
  compiled,
  compiled.exports,
  require,
  http,
)
const { MaProTable, getProTableToolbars, registerProTableToolbar, removeProTableToolbar, plugin, ToastContext } =
  compiled.exports
const importTool = 'i-hugeicons:folder-import'
const exportTool = 'i-hugeicons:folder-export'
const emptyRows = []

function options(extra = {}) {
  return { header: { show: false }, tableOptions: { showPagination: false }, ...extra }
}

function allocationOptions(extra = {}) {
  return options({ importExportPro: { api: { list: '/admin/creator/allocation/list' } }, ...extra })
}

async function mount(t, props) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = async nextProps => {
    await act(async () =>
      root.render(
        createElement(
          ToastContext.Provider,
          { value: { toast: () => {} } },
          createElement(MaProTable, { data: emptyRows, ...nextProps }),
        ),
      ),
    )
  }
  t.after(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  await render(props)
  return { container, render }
}

function button(container, text) {
  return [...container.querySelectorAll('button')].find(node => node.textContent === text)
}

async function click(element) {
  assert.ok(element, '应找到可点击的控件')
  await act(async () => element.click())
}

beforeEach(async () => {
  await act(async () => {
    for (const name of getProTableToolbars().keys()) removeProTableToolbar(name)
  })
  calls.length = 0
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

test('注册工具默认进入右侧并按 order 排序，保留左侧动作和刷新', async t => {
  registerProTableToolbar({ name: 'last', order: 9, render: () => createElement('button', null, '后工具') })
  registerProTableToolbar({ name: 'first', order: 8, render: () => createElement('button', null, '前工具') })
  const view = await mount(t, { options: options(), toolbarLeft: createElement('button', null, '新增') })
  const toolbar = view.container.querySelector('[aria-label="表格工具栏"]')
  assert.equal(toolbar.children[0].textContent, '新增')
  assert.deepEqual(
    [...toolbar.lastElementChild.querySelectorAll('button')].map(node => node.textContent),
    ['刷新', '前工具', '后工具'],
  )
})

test('同名工具替换不重复，旧清理函数不会移除新注册，注销会更新已挂载表格', async t => {
  const removeOld = registerProTableToolbar({ name: 'tool', render: () => createElement('button', null, '旧工具') })
  const view = await mount(t, { options: options() })
  let removeNew
  await act(async () => {
    removeNew = registerProTableToolbar({ name: 'tool', render: () => createElement('button', null, '新工具') })
  })
  assert.equal(button(view.container, '旧工具'), undefined)
  assert.ok(button(view.container, '新工具'))
  await act(async () => removeOld())
  assert.ok(button(view.container, '新工具'))
  await act(async () => removeNew())
  assert.equal(button(view.container, '新工具'), undefined)
})

test(
  '插件 setup 自动注入工具，重复启动不重复显示，toolStates 支持布尔和函数开关',
  { skip: !hasImportExport && '当前仓库未安装本地导入导出插件' },
  async t => {
    const ref = createRef()
    const view = await mount(t, { ref, options: allocationOptions() })
    assert.equal(button(view.container, '导入'), undefined)
    await act(async () => {
      plugin.hooks.setup()
      plugin.hooks.setup()
    })
    assert.equal([...view.container.querySelectorAll('button')].filter(node => node.textContent === '导入').length, 1)
    assert.equal([...view.container.querySelectorAll('button')].filter(node => node.textContent === '导出').length, 1)
    await act(async () =>
      ref.current.setProTableOptions({ toolStates: { [importTool]: false, [exportTool]: () => true } }),
    )
    assert.equal(button(view.container, '导入'), undefined)
    assert.ok(button(view.container, '导出'))
    await view.render({
      ref,
      options: allocationOptions({ toolStates: { [importTool]: () => true, [exportTool]: false } }),
    })
    assert.ok(button(view.container, '导入'))
    assert.equal(button(view.container, '导出'), undefined)
  },
)

test(
  '无导入导出接口的静态表格不注入按钮，toolbar=false 可关闭全部工具',
  { skip: !hasImportExport && '当前仓库未安装本地导入导出插件' },
  async t => {
    plugin.hooks.setup()
    const view = await mount(t, { options: options() })
    assert.equal(view.container.querySelector('[aria-label="表格工具栏"]'), null)
    await view.render({ options: allocationOptions({ toolbar: false }) })
    assert.equal(view.container.querySelector('[aria-label="表格工具栏"]'), null)
  },
)

test(
  '自动导入沿用当前表格配置，未传外部 ref 也能在导入后刷新',
  { skip: !hasImportExport && '当前仓库未安装本地导入导出插件' },
  async t => {
    plugin.hooks.setup()
    const requests = []
    const view = await mount(t, {
      options: allocationOptions({
        requestOptions: {
          autoRequest: false,
          api: params => {
            requests.push(params)
            return { list: [], total: 0 }
          },
        },
      }),
    })
    await click(button(view.container, '导入'))
    const input = document.querySelector('input[type="file"]')
    const file = new File(['aweme_name\n测试达人'], 'allocation.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    await act(async () => input.dispatchEvent(new dom.Event('change', { bubbles: true })))
    await click(button(document, '开始导入'))
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, '/admin/creator/allocation/import')
    assert.equal(calls[0].body.get('file').name, 'allocation.csv')
    assert.equal(calls[0].body.get('mode'), 'async')
    assert.equal(requests.length, 1)
  },
)

test(
  '模板下载沿用默认 downloadTemplate 路径并受配置权限控制',
  { skip: !hasImportExport && '当前仓库未安装本地导入导出插件' },
  async t => {
    plugin.hooks.setup()
    const list = '/admin/creator/allocation/list'
    const view = await mount(t, {
      options: allocationOptions({ importExportPro: { api: { list }, permissions: { template: false } } }),
    })
    await click(button(view.container, '导入'))
    assert.equal(button(document, '下载导入模板').disabled, true)
    assert.equal(calls.length, 0)
    await view.render({ options: allocationOptions() })
    const originalClick = dom.HTMLAnchorElement.prototype.click
    dom.HTMLAnchorElement.prototype.click = () => {}
    try {
      await click(button(document, '下载导入模板'))
    } finally {
      dom.HTMLAnchorElement.prototype.click = originalClick
    }
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, '/admin/creator/allocation/downloadTemplate')
    assert.equal(calls[0].config.responseType, 'blob')
  },
)

test(
  '自动导出通过同一列表地址推导字段和提交接口',
  { skip: !hasImportExport && '当前仓库未安装本地导入导出插件' },
  async t => {
    plugin.hooks.setup()
    const view = await mount(t, { options: allocationOptions() })
    await click(button(view.container, '导出'))
    assert.equal(calls[0].url, '/admin/creator/allocation/exportFields')
    await click(button(document, '开始导出'))
    assert.equal(calls[1].url, '/admin/creator/allocation/export')
    assert.equal(calls[1].body.mode, 'async')
    assert.deepEqual(calls[1].body.fields, ['aweme_name'])
  },
)
