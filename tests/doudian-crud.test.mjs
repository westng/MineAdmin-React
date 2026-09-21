import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { after, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'

const pagePath = new URL('../src/modules/account/doudian/views/index.tsx', import.meta.url)
if (!existsSync(pagePath)) {
  test.skip('抖店账户 CRUD：业务模块未收录时跳过')
} else {
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
  ]) {
    Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
  }
  globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
  globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
  globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const require = createRequire(import.meta.url)
  const { createRoot } = require('react-dom/client')
  const fixture = { permissions: new Set(), reads: [], writes: [], messages: [] }
  const rows = [
    { id: 11, shop_id: 101, shop_name: '测试甲店', shop_type: '1', scope: '只读授权字段' },
    { id: 22, shop_id: 202, shop_name: '测试乙店', shop_type: '2', scope: '另一只读字段' },
  ]
  const success = data => ({ data: { code: 200, data } })
  fixture.http = {
    get: async (url, config) => {
      fixture.reads.push({ url, params: config?.params })
      return success({ list: rows, total: rows.length })
    },
    ...Object.fromEntries(
      ['post', 'put', 'delete'].map(method => [
        method,
        (url, data) =>
          new Promise((resolve, reject) => {
            fixture.writes.push({ method, url, data, resolve: () => resolve(success(null)), reject })
          }),
      ]),
    ),
  }
  const bundle = await build({
    entryPoints: [fileURLToPath(pagePath)],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    plugins: [
      {
        name: 'doudian-local-fixtures',
        setup(builder) {
          builder.onResolve({ filter: /^@\/provider\/http$/ }, () => ({ path: 'http', namespace: 'fixture' }))
          builder.onResolve({ filter: /^@\/hooks\/framework\/use-permission$/ }, () => ({
            path: 'permission',
            namespace: 'fixture',
          }))
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
            contents:
              path === 'http'
                ? 'export default __fixture.http'
                : `
            export const hasAuth = permission => __fixture.permissions.has(permission);
            export const usePermission = () => ({ hasAuth });
            export const PermissionGate = ({ permission, children }) => hasAuth(permission) ? children : null;
          `,
          }))
        },
      },
    ],
  })
  const compiled = { exports: {} }
  new Function('module', 'exports', 'require', '__fixture', bundle.outputFiles[0].text)(
    compiled,
    compiled.exports,
    require,
    fixture,
  )
  const Page = compiled.exports.default
  window.addEventListener('mine:message', event => fixture.messages.push(event.detail))
  window.confirm = () => {
    throw new Error('标准 CRUD 不应调用原生 confirm')
  }
  beforeEach(() => {
    fixture.permissions = new Set(
      ['create', 'save', 'delete', 'reauthorize', 'refresh-auth'].map(name => `account:doudian:${name}`),
    )
    fixture.reads.length = 0
    fixture.writes.length = 0
    fixture.messages.length = 0
  })
  after(async () => {
    await dom.happyDOM.abort()
    dom.close()
  })

  async function mount(t) {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const render = () => act(async () => root.render(createElement(Page)))
    t.after(async () => {
      await act(async () => root.unmount())
      container.remove()
    })
    await render()
    return { container, render }
  }
  function button(text, scope = document) {
    return [...scope.querySelectorAll('button')].find(
      node => node.textContent.trim() === text || node.getAttribute('aria-label') === text,
    )
  }
  async function click(element) {
    assert.ok(element, '应找到操作入口')
    await act(async () => element.click())
  }
  async function enter(input, value) {
    assert.ok(input, '应找到输入字段')
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new dom.Event('input', { bubbles: true }))
    })
  }
  const dialog = () => document.querySelector('[role="dialog"]')
  const field = name => dialog().querySelector(`#${name}`)
  const firstRow = () => document.querySelector('tbody tr')

  test('抖店直接使用 MaProTable：列表请求、搜索参数和操作列生效', async t => {
    const { container } = await mount(t)
    assert.equal(fixture.reads[0].url, '/admin/account/doudian/list')
    assert.equal(fixture.reads[0].params.page, 1)
    assert.equal(fixture.reads[0].params.page_size, 20)
    assert.match(container.textContent, /测试甲店/)
    assert.ok(button('编辑', firstRow()))
    await enter(container.querySelector('#shop_name'), '测试乙店')
    await click(button('搜索', container))
    assert.equal(fixture.reads.at(-1).params.shop_name, '测试乙店')
  })

  test('新增使用默认弹窗：校验、失败保留、重复提交保护和成功刷新', async t => {
    await mount(t)
    await click(button('新增'))
    await click(button('保存', dialog()))
    assert.match(dialog().textContent, /请输入店铺ID/)
    assert.equal(fixture.writes.length, 0)
    await enter(field('shop_id'), '303.5')
    await click(button('保存', dialog()))
    assert.match(dialog().textContent, /店铺ID必须为整数/)
    assert.equal(fixture.writes.length, 0)
    await enter(field('shop_id'), '303')
    await enter(field('shop_name'), '新增测试店')
    await enter(field('shop_type'), '3')
    await act(async () => {
      button('保存', dialog()).click()
      button('保存', dialog()).click()
    })
    assert.equal(fixture.writes.length, 1)
    const request = fixture.writes[0]
    assert.equal(request.method, 'post')
    assert.equal(request.url, '/admin/account/doudian/create')
    assert.deepEqual(request.data, { shop_id: 303, shop_name: '新增测试店', shop_type: '3' })
    assert.equal(button('取消', dialog()).disabled, true)
    await act(async () => request.reject({ code: 500, message: '店铺保存失败' }))
    assert.equal(field('shop_name').value, '新增测试店')
    assert.equal(fixture.messages.at(-1).message, '店铺保存失败')
    await click(button('保存', dialog()))
    await act(async () => fixture.writes[1].resolve())
    assert.equal(dialog(), null)
    assert.equal(fixture.reads.length, 2)
    assert.equal(fixture.messages.at(-1).message, '创建成功')
  })

  test('编辑按行 ID 保存，载荷只包含可编辑字段，重开新增不残留旧数据', async t => {
    await mount(t)
    await click(button('编辑', firstRow()))
    assert.equal(field('shop_name').value, '测试甲店')
    await enter(field('shop_name'), '修改后的店铺')
    await click(button('保存', dialog()))
    const request = fixture.writes[0]
    assert.equal(request.method, 'put')
    assert.equal(request.url, '/admin/account/doudian/save/11')
    assert.deepEqual(request.data, { shop_id: 101, shop_name: '修改后的店铺', shop_type: '1' })
    await act(async () => request.resolve())
    await click(button('新增'))
    assert.equal(field('shop_name').value, '')
    assert.equal(field('shop_id').value, '')
    await click(button('取消', dialog()))
    assert.equal(fixture.writes.length, 1)
  })

  test('批量删除使用公共确认：取消不写入，失败保留选择，成功清理选择并刷新', async t => {
    const { container } = await mount(t)
    await click(container.querySelectorAll('tbody tr')[0].querySelector('[role="checkbox"]'))
    await click(container.querySelectorAll('tbody tr')[1].querySelector('[role="checkbox"]'))
    await click(button('批量删除', container))
    assert.match(dialog().textContent, /确定删除 2 条记录/)
    await click(button('取消', dialog()))
    assert.equal(fixture.writes.length, 0)
    await click(button('批量删除', container))
    await click(button('删除', dialog()))
    const request = fixture.writes[0]
    assert.equal(request.method, 'delete')
    assert.equal(request.url, '/admin/account/doudian/delete')
    assert.deepEqual(request.data, { data: [11, 22] })
    await act(async () => request.reject({ message: '暂时无法删除' }))
    assert.ok(dialog())
    assert.equal(button('批量删除', container).disabled, false)
    await click(button('删除', dialog()))
    await act(async () => fixture.writes[1].resolve())
    assert.equal(dialog(), null)
    assert.equal(button('批量删除', container).disabled, true)
    assert.equal(firstRow().querySelector('[role="checkbox"]').getAttribute('aria-checked'), 'false')
    assert.equal(fixture.reads.length, 2)
  })

  test('标准操作列保留重新授权、刷新授权及单行删除入口', async t => {
    await mount(t)
    await click(button('重新授权', firstRow()))
    assert.equal(fixture.writes[0].url, '/admin/account/doudian/reauthorize/11')
    assert.equal(fixture.writes[0].data, undefined)
    await act(async () => fixture.writes[0].resolve())
    await click(button('更多操作', firstRow()))
    await click([...document.querySelectorAll('[role="menuitem"]')].find(node => node.textContent.includes('刷新授权')))
    assert.equal(fixture.writes[1].url, '/admin/account/doudian/refresh-auth/11')
    await act(async () => fixture.writes[1].resolve())
    await click(button('更多操作', firstRow()))
    await click([...document.querySelectorAll('[role="menuitem"]')].find(node => node.textContent.includes('删除')))
    assert.match(dialog().textContent, /确定删除 1 条记录/)
    await click(button('删除', dialog()))
    assert.deepEqual(fixture.writes[2].data, { data: [11] })
    await act(async () => fixture.writes[2].resolve())
  })

  test('CRUD 权限控制入口，打开后失去保存权限也不能提交', async t => {
    const view = await mount(t)
    await click(button('编辑', firstRow()))
    fixture.permissions.delete('account:doudian:save')
    fixture.permissions.delete('account:doudian:create')
    fixture.permissions.delete('account:doudian:delete')
    await view.render()
    assert.equal(button('保存', dialog()), undefined)
    assert.equal(button('新增', view.container), undefined)
    assert.equal(button('批量删除', view.container), undefined)
    await act(async () =>
      dialog()
        .querySelector('form')
        .dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })),
    )
    assert.equal(fixture.writes.length, 0)
    await click(button('取消', dialog()))
    assert.equal(button('编辑', firstRow()), undefined)
  })
}
