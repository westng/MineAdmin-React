import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement as h } from 'react'

const dom = new Window({ url: 'http://localhost/' })
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
])
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const require = createRequire(import.meta.url)
const { createRoot } = require('react-dom/client')
const result = await build({
  stdin: {
    contents: `
      export { createAppRuntime } from './src/app/runtime/create-runtime'
      export { AppProviders } from './src/provider/app-provider'
      export { default as OrderMainPage } from './src/modules/order/order-main/views'
      export { createApi } from './src/modules/order/order-main/api'
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  outfile: 'order-main-test.cjs',
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  define: { 'import.meta.glob': '__testAssetGlob', 'import.meta.env': '{}' },
  banner: { js: 'const __testAssetGlob = () => ({})' },
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const core = compiled.exports
const response = data => ({ data: { code: 200, data } })
async function until(check) {
  for (let i = 0; i < 100; i++) {
    if (check()) return
    await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
  }
  assert.fail('订单页未达到预期状态')
}
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

async function mount(
  t,
  permissions = ['data:orders:list'],
  product = {},
  summaryData = { total_count: 45, total_amount: '450', amount_field: 'actual_receive_amount', statuses: [] },
) {
  const runtime = core.createAppRuntime({ storage: { getItem: () => null, setItem() {}, removeItem() {} } })
  runtime.query.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  runtime.session.setState({ permissions, token: 'test', userInfo: { id: 1 } })
  const calls = []
  runtime.http.get = async (url, config) => {
    calls.push({ url, params: config?.params })
    if (url.endsWith('/summary')) return response(summaryData)
    if (url.endsWith('/list')) {
      const { page = 1, page_size: size = 20 } = config.params
      return response({
        list: Array.from({ length: Math.min(size, Math.max(0, 45 - (page - 1) * size)) }, (_, index) => {
          const id = (page - 1) * size + index + 1
          return { id, order_id: `ORDER-${id}`, order_items: [{ sub_order_id: `SUB-${id}`, ...product }] }
        }),
        total: 45,
      })
    }
    throw Error(`Unexpected request: ${url}`)
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    runtime.dispose()
    container.remove()
  })
  await act(async () => root.render(h(core.AppProviders, { runtime }, h(core.OrderMainPage))))
  return {
    runtime,
    container,
    calls,
    listCalls: () => calls.filter(call => call.url.endsWith('/orders/list')),
    summaryCalls: () => calls.filter(call => call.url.endsWith('/orders/summary')),
  }
}

test('订单页按服务端总数分页，翻页/修改页大小/搜索均通过资源请求', async t => {
  const { runtime, container, listCalls, summaryCalls } = await mount(t)
  await until(() => container.textContent.includes('第 1-20 条，共 45 条'))
  assert.equal(container.querySelector('[aria-label="450.00"]')?.getAttribute('aria-label'), '450.00')
  const refresh = container.querySelector('button[aria-label="刷新订单健康"]')
  assert.ok(refresh)
  assert.ok(refresh.querySelector('svg'))
  assert.equal(refresh.textContent, '刷新')
  await act(async () => refresh.click())
  await until(() => summaryCalls().length === 2)
  assert.deepEqual(listCalls()[0].params, { page: 1, page_size: 20 })
  await act(async () => [...container.querySelectorAll('button')].find(node => node.textContent === '下一页').click())
  await until(() => container.textContent.includes('第 21-40 条，共 45 条'))
  assert.deepEqual(listCalls().at(-1).params, { page: 2, page_size: 20 })
  assert.match(container.textContent, /SUB-21/)

  const input = container.querySelector('[placeholder="请输入订单编号"]')
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, 'SUB-45')
    input.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
  const search = [...container.querySelectorAll('button')].find(node => node.textContent === '搜索')
  await act(async () => search.click())
  await until(() => listCalls().at(-1).params['order_items.sub_order_id'] === 'SUB-45')
  assert.equal(listCalls().at(-1).params.page, 1)
  assert.equal(listCalls().at(-1).params.page_size, 20)

  const sizeTrigger = container.querySelector('[aria-label="每页"]')
  assert.ok(sizeTrigger)
  await act(async () => sizeTrigger.click())
  const fifty = [...document.querySelectorAll('[role="option"]')].find(node => node.textContent.includes('50'))
  await act(async () => fifty.click())
  await until(() => container.textContent.includes('第 1-45 条，共 45 条'))
  assert.deepEqual(listCalls().at(-1).params, { 'order_items.sub_order_id': 'SUB-45', page: 1, page_size: 50 })

  const params = listCalls().at(-1).params
  const key = core.createApi(runtime).pageOrders.queryOptions(params).queryKey
  assert.equal(runtime.query.getQueryData(key).data.data.total, 45)
})

test('订单列表和详情通过商品信息组件展示完整标签', async t => {
  const expected = ['专属达人渠道', '顺丰配送', '7天极速退', '精选联盟', '非广告', '直播']
  const { container } = await mount(t, undefined, {
    product_name: '带标签的订单商品',
    product_id: '100',
    sku_order_tag_ui: expected.map(text => ({ text })),
  })
  await until(() => container.querySelector('[data-slot="product-tags"]'))
  assert.deepEqual(
    [...container.querySelector('[data-slot="product-tags"]').children].map(node => node.textContent),
    expected,
  )
  const detailButton =
    container.querySelector('button[aria-label="详情"]') ??
    [...container.querySelectorAll('button')].find(node => node.textContent.trim() === '详情') ??
    container.querySelector('button[title="详情"]')
  assert.ok(detailButton)
  await act(async () => detailButton.click())
  await until(() => document.querySelector('[role="dialog"] [data-slot="product-tags"]'))
  const drawer = document.querySelector('[role="dialog"]')
  assert.deepEqual(
    [...drawer.querySelector('[data-slot="product-tags"]').children].map(node => node.textContent),
    expected,
  )
  assert.equal(drawer.querySelectorAll('[data-slot="product-tags"]').length, 1)
})

test('没有订单查看权限时不请求列表或统计', async t => {
  const { container, calls } = await mount(t, [])
  assert.match(container.textContent, /暂无订单查看权限/)
  assert.equal(calls.length, 0)
})

test('订单健康金额为零时仍显示两位小数', async t => {
  const { container } = await mount(
    t,
    ['data:orders:list'],
    {},
    {
      total_count: 0,
      total_amount: '0',
      amount_field: 'actual_receive_amount',
      statuses: [],
    },
  )
  await until(() => container.querySelector('[aria-label="0.00"]'))
})
