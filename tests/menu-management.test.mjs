import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement, useState } from 'react'

const dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true } })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLFormElement', 'Element', 'Node', 'NodeFilter', 'DocumentFragment', 'MutationObserver', 'ResizeObserver', 'Event', 'MouseEvent', 'KeyboardEvent', 'PointerEvent', 'FocusEvent', 'CustomEvent', 'DOMRect', 'ShadowRoot']) {
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
      "export { default as MenuPage } from './src/modules/base/permission/menu/views/components/permission-menu-page'",
      "export { MenuCascader } from './src/modules/base/permission/menu/components/menu-cascader'",
      "export { HeaderActionsSetterContext } from './src/layouts/components/bars/toolbar/header-actions-context'",
      "export { setApi } from 'menu-test-api'",
    ].join('\n'),
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{
    name: 'menu-test-fixtures',
    setup(build) {
      build.onResolve({ filter: /^(menu-test-api|@\/modules\/base\/permission\/menu\/api\/menu)$/ }, () => ({ path: 'api', namespace: 'menu-fixture' }))
      build.onResolve({ filter: /^@\/router\/component-registry$/ }, () => ({ path: 'views', namespace: 'menu-fixture' }))
      build.onResolve({ filter: /^@\/components\/common\/(icon-picker|ma-icon)$/ }, () => ({ path: 'icons', namespace: 'menu-fixture' }))
      build.onLoad({ filter: /.*/, namespace: 'menu-fixture' }, ({ path }) => ({
        contents: path === 'api'
          ? `let api; export const setApi = value => { api = value }; export const page = () => api.page(); export const save = (...args) => api.save(...args); export const create = (...args) => api.create(...args); export const deleteByIds = (...args) => api.deleteByIds(...args)`
          : path === 'views' ? `export const resolveView = () => () => null` : `export const MaIcon = () => null; export const MaIconPicker = () => null`,
      }))
    },
  }],
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const { MenuPage, MenuCascader, HeaderActionsSetterContext, setApi } = compiled.exports

const response = data => ({ data: { code: 200, data: structuredClone(data) } })
function menus() {
  return [{
    id: 1, parent_id: 0, name: 'permission', path: '/permission', status: 1,
    meta: { type: 'M', title: '权限管理' },
    children: [{
      id: 10, parent_id: 1, name: 'permission:user', path: '/permission/user', status: 1,
      component: 'base/permission/user/views/index', meta: { type: 'M', title: '用户管理' },
      children: [
        { id: 101, parent_id: 10, name: 'permission:user:index', status: 1, meta: { type: 'B', title: '查看用户', i18n: 'user.view' } },
        { id: 102, parent_id: 10, name: 'permission:user:update', status: 1, meta: { type: 'B', title: '编辑用户' } },
      ],
    }],
  }]
}

function Header({ children }) {
  const [actions, setActions] = useState(null)
  return createElement(HeaderActionsSetterContext.Provider, { value: setActions }, createElement('header', null, actions), children)
}

async function mount(t, component = createElement(MenuPage)) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => { await act(async () => root.unmount()); container.remove() })
  await act(async () => root.render(createElement(Header, null, component)))
  await act(async () => { await setTimeout(0) })
  return container
}

function button(container, label) {
  return [...container.querySelectorAll('button')].find(node => node.textContent.trim() === label || node.getAttribute('aria-label') === label)
}

function treeItem(container, label) {
  return [...container.querySelectorAll('[role="treeitem"]')].find(node => node.getAttribute('aria-label') === label)
}

async function click(element) {
  assert.ok(element, '应找到目标控件')
  await act(async () => element.click())
}

async function enterValue(input, value) {
  assert.ok(input, '应找到输入控件')
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
}

async function openUserMenu(container) {
  await click(treeItem(container, '权限管理'))
  await click(treeItem(container, '用户管理'))
}

after(async () => { await dom.happyDOM.abort(); dom.close() })

test('菜单树可选择 B 类型，右侧切换为按钮编辑并保存当前按钮', async t => {
  const data = menus()
  const requests = []
  setApi({
    page: async () => response(data),
    save: async (id, payload) => {
      requests.push({ id, payload: structuredClone(payload) })
      Object.assign(data[0].children[0].children[0], payload)
      return response(null)
    },
  })
  const container = await mount(t)
  await openUserMenu(container)
  assert.ok(treeItem(container, '查看用户'), 'B 类型应显示在所属菜单下')
  assert.match(container.querySelector('aside').textContent, /菜单树4/)
  await click(treeItem(container, '查看用户'))
  const panel = container.querySelector('section')
  assert.match(panel.querySelector('h2').textContent, /编辑按钮权限/)
  assert.equal(panel.querySelector('#menu-title').value, '查看用户')
  assert.equal(panel.querySelector('#menu-name').value, 'permission:user:index')
  assert.match(button(panel, '选择父级菜单').textContent, /用户管理/)
  assert.doesNotMatch(panel.textContent, /路由地址|组件路径|重定向|新增按钮/)
  await enterValue(panel.querySelector('#menu-title'), '查询用户')
  await click(button(panel, '保存'))
  assert.equal(requests.length, 1)
  assert.equal(requests[0].id, 101)
  assert.equal(requests[0].payload.parent_id, 10)
  assert.equal(requests[0].payload.meta.type, 'B')
  assert.equal(requests[0].payload.meta.title, '查询用户')
  assert.equal(requests[0].payload.meta.i18n, 'user.view')
  assert.ok(treeItem(container, '查询用户'))
  assert.equal(treeItem(container, '查看用户'), undefined)
  await click(treeItem(container, '用户管理'))
  assert.match(panel.querySelector('h2').textContent, /编辑菜单/)
  assert.match(panel.textContent, /路由地址/)
  assert.equal(panel.querySelector('input[aria-label="第 1 项按钮名称"]').value, '查询用户')
})

test('父菜单增删按钮后刷新树和表单，重复保存保留新按钮 ID', async t => {
  const original = menus()
  const withButton = menus()
  withButton[0].children[0].children.push({ id: 103, parent_id: 10, name: 'permission:user:export', status: 1, meta: { type: 'B', title: '导出用户' } })
  const requests = []
  setApi({
    page: async () => response(requests.length > 0 && requests.length < 3 ? withButton : original),
    save: async (id, payload) => { requests.push({ id, payload: structuredClone(payload) }); return response(null) },
  })
  const container = await mount(t)
  await openUserMenu(container)
  const panel = container.querySelector('section')
  await click(button(panel, '新增按钮'))
  await enterValue(panel.querySelector('input[aria-label="第 3 项按钮名称"]'), '导出用户')
  await enterValue(panel.querySelector('input[aria-label="第 3 项按钮编码"]'), 'permission:user:export')
  await click(button(panel, '保存'))
  assert.equal(requests[0].id, 10)
  assert.equal(requests[0].payload.btnPermission.at(-1).code, 'permission:user:export')
  assert.ok(treeItem(container, '导出用户'), '新增按钮保存后应出现在已展开的菜单树中')
  await click(button(panel, '保存'))
  assert.equal(requests[1].payload.btnPermission.at(-1).id, 103)
  await click(button(panel, '删除导出用户'))
  await click(button(panel, '保存'))
  assert.deepEqual(requests[2].payload.btnPermission.map(item => item.id), [101, 102])
  assert.equal(treeItem(container, '导出用户'), undefined)
  assert.ok(treeItem(container, '查看用户'))
})

test('父级菜单单选保留完整 ID，不把两位数菜单 ID 截断', async t => {
  const changes = []
  const container = await mount(t, createElement(MenuCascader, {
    menus: [
      { id: 10, meta: { type: 'M', title: '原菜单' } },
      { id: 20, meta: { type: 'M', title: '目标菜单' } },
    ],
    value: 10,
    onChange: value => changes.push(value),
  }))
  await click(button(container, '选择父级菜单'))
  await click([...document.querySelectorAll('[data-slot="cascader-item"]')].find(node => node.textContent.trim() === '目标菜单'))
  assert.deepEqual(changes, [20])
})
