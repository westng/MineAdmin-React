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
      export { default as AftersalePage } from './src/modules/order/order-after-sale/views'
      export { readSyncRange } from './src/modules/order/order-after-sale/views/data/getSyncItems'
      export { getProductItems } from './src/modules/order/order-after-sale/views/data/getProductItems'
      export { default as getTableColumns } from './src/modules/order/order-after-sale/views/data/getTableColumns'
      export { AftersaleDetailsDrawer } from './src/modules/order/order-after-sale/views/components/AftersaleDetailsDrawer'
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  define: { 'import.meta.glob': '__testAssetGlob', 'import.meta.env': '{}' },
  banner: { js: 'const __testAssetGlob = () => ({})' },
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const core = compiled.exports
const response = (data = null) => ({ data: { code: 200, data } })
const button = (text, scope = document) => [...scope.querySelectorAll('button')].find(node => node.textContent === text)
const dialog = () => document.querySelector('[role="dialog"]')

async function until(check) {
  for (let i = 0; i < 100; i++) {
    if (check()) return
    await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
  }
  assert.fail('售后同步弹窗未达到预期状态')
}

after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

async function mount(t) {
  const runtime = core.createAppRuntime({ storage: { getItem: () => null, setItem() {}, removeItem() {} } })
  runtime.query.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  runtime.session.setState({
    permissions: ['data:aftersale:list', 'data:aftersale:sync'],
    token: 'test',
    userInfo: { id: 1 },
  })
  let listCalls = 0
  const shopCalls = []
  runtime.http.request = async config => {
    assert.equal(config.url, '/admin/account/doudian/list')
    shopCalls.push(config.params)
    return response({
      list: [
        { shop_id: '90071992547409931', shop_name: '测试店铺甲' },
        { shop_id: '90071992547409932', shop_name: '测试店铺乙' },
      ],
      total: 2,
    })
  }
  runtime.http.get = async url => {
    assert.equal(url, '/admin/data/aftersale/list')
    listCalls++
    return response({ list: [], total: 0 })
  }
  const posts = []
  runtime.http.post = async (url, payload) => {
    posts.push({ url, payload })
    return response()
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    runtime.dispose()
    container.remove()
  })
  await act(async () => root.render(h(core.AppProviders, { runtime }, h(core.AftersalePage))))
  await until(() => listCalls > 0)
  await act(async () => button('同步数据', container).click())
  await until(() => dialog()?.textContent.includes('同步售后数据'))
  return { runtime, container, posts, shopCalls, listCalls: () => listCalls }
}

async function selectYesterday() {
  await act(async () => document.querySelector('button[aria-label="同步时间范围"]').click())
  await until(() => button('昨天'))
  await act(async () => button('昨天').click())
}

async function mountProducts(t, row) {
  const runtime = core.createAppRuntime({ storage: { getItem: () => null, setItem() {}, removeItem() {} } })
  runtime.http.get = runtime.http.request = async () => {
    throw new Error('商品展示不应请求外部接口')
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    runtime.dispose()
    container.remove()
  })
  const column = core
    .getTableColumns({ onDetail() {}, onRecords() {}, onDelete() {} })
    .find(item => item.label === '商品信息')
  assert.equal(column.prop, 'aftersale_item')
  await act(async () =>
    root.render(
      h(
        core.AppProviders,
        { runtime },
        h(
          'div',
          null,
          column.cellRender({ row }),
          h(core.AftersaleDetailsDrawer, { row, open: true, onOpenChange() {} }),
        ),
      ),
    ),
  )
  await until(() => dialog()?.textContent.includes('商品信息'))
  return container
}

test('列表和详情只展示本次申请售后的商品，并使用售后商品的数量和金额', async t => {
  const row = {
    id: 1,
    aftersale_id: 'AFTER-1',
    order_id: 'ORDER-1',
    aftersale_item: [
      {
        id: 1,
        product_name: '本次售后商品',
        product_id: '101',
        product_image: '/aftersale.png',
        sku_order_id: 'SKU-AFTER-1',
        item_quantity: 1,
        item_sum_amount: '23.45',
        sku_pay_amount: '20.50',
        tags: [
          { tag_detail: '专属达人渠道', tag_link_url: '', tag_detail_en: 'creator_channel' },
          { tag_detail: '精选联盟', tag_link_url: '', tag_detail_en: 'alliance' },
          { tag_detail: '非广告', tag_link_url: '', tag_detail_en: 'non_ad' },
          { tag_detail: '直播', tag_link_url: '', tag_detail_en: 'live' },
        ],
        insurance_tags: [
          { tag_detail: '顺丰配送', tag_link_url: '', tag_detail_en: 'sf' },
          { tag_detail: '7天极速退', tag_link_url: '', tag_detail_en: 'fast_return' },
          { tag_detail: '顺丰配送', tag_link_url: '', tag_detail_en: 'sf' },
        ],
        product_pic: '/wrong.png',
        item_num: 9,
        origin_amount: '99.00',
        pay_amount: '99.00',
      },
    ],
    order_items: [{ product_name: '订单商品甲' }, { product_name: '订单商品乙' }],
  }
  const container = await mountProducts(t, row)
  assert.equal(dialog().style.width, '40%')
  assert.ok(dialog().className.includes('max-sm:w-[calc(100vw-2rem)]!'))
  assert.match(container.textContent, /本次售后商品/)
  assert.match(dialog().textContent, /本次售后商品/)
  assert.doesNotMatch(document.body.textContent, /订单商品甲|订单商品乙/)
  assert.match(dialog().textContent, /数量 × 1/)
  assert.match(dialog().textContent, /¥23\.45/)
  assert.match(dialog().textContent, /付款 ¥20\.50/)
  assert.doesNotMatch(dialog().textContent, /99\.00|数量 × 9/)
  const sources = [...document.querySelectorAll('img')].map(node => node.getAttribute('src'))
  assert.ok(sources.includes('/aftersale.png'))
  assert.ok(!sources.includes('/wrong.png'))
  const expectedTags = ['专属达人渠道', '精选联盟', '非广告', '直播', '顺丰配送', '7天极速退']
  for (const scope of [container, dialog()]) {
    const group = scope.querySelector('[data-slot="product-tags"]')
    assert.ok(group)
    assert.deepEqual(
      [...group.children].map(node => node.textContent),
      expectedTags,
    )
  }
  assert.equal(dialog().querySelectorAll('[data-slot="product-tags"]').length, 1)
})

test('售后商品缺失时显示空态，不回退到订单商品', async t => {
  const row = { order_items: [{ product_name: '不能替代的订单商品' }], aftersale_item: [] }
  assert.deepEqual(core.getProductItems({ order_items: row.order_items }), [])
  const container = await mountProducts(t, row)
  assert.match(container.textContent, /无商品信息/)
  assert.match(dialog().textContent, /暂无商品明细/)
  assert.doesNotMatch(document.body.textContent, /不能替代的订单商品/)
})

test('详情补齐申请凭证、退款明细、退换货、仲裁与时间信息', async t => {
  await mountProducts(t, {
    aftersale_id: 'AFTER-DETAIL',
    order_id: 'ORDER-DETAIL',
    shop_id: '100',
    shop_id_text: '测试店铺',
    after_sale_type: 3,
    after_sale_status: 7,
    after_sale_apply_count: 1,
    part_type: 0,
    apply_role_text: '买家',
    reason: '商品尺寸不符',
    reason_remark: '需要换货\n补充说明',
    reason_code: 101,
    evidence: ['https://example.test/evidence-one.png', { image_url: 'https://example.test/evidence-two.png' }],
    refund_status: 3,
    refund_type_text: '原路退回',
    refund_total_amount: '25.50',
    real_refund_amount: 0,
    refund_post_amount: '5.00',
    refund_promotion_amount: 0,
    deduction_amount: '1.20',
    platform_discount_return_amount: '2.00',
    kol_discount_return_amount: '3.00',
    need_return_count: 1,
    got_pkg_text: '已收到货',
    return_method_text: '买家寄回',
    return_type: 1,
    province: '测试省',
    city: '测试市',
    town: '测试区',
    street: '测试街道',
    detail: '测试退货地址',
    exchange_sku_id: '90071992547409931',
    exchange_code: 'SKU-EXCHANGE',
    exchange_price: '20.50',
    arbitrate_status: 2,
    arbitrate_id: 'ARBITRATE-1',
    arbitrate_blame_text: '商家',
    create_time: '2026-10-01 10:00:00',
    apply_time: '2026-10-02 11:00:00',
    update_time: '2026-10-03 12:00:00',
  })
  const value = label =>
    [...dialog().querySelectorAll('dt')].find(node => node.textContent === label)?.nextElementSibling?.textContent
  assert.equal(value('所属店铺'), '测试店铺')
  assert.equal(value('售后类型'), '换货')
  assert.equal(value('售后状态'), '售后退货中')
  assert.equal(value('部分退状态'), '全额退款')
  assert.equal(value('申请描述'), '需要换货\n补充说明')
  assert.equal(value('售后总金额'), '¥25.50')
  assert.equal(value('实际退款'), '¥0.00')
  assert.equal(value('退还运费'), '¥5.00')
  assert.equal(value('退款状态'), '退款成功')
  assert.equal(value('寄回类型'), '自行寄回')
  assert.equal(value('退货地址'), '测试省 测试市 测试区 测试街道 测试退货地址')
  assert.equal(value('换货 SKU'), '90071992547409931')
  assert.equal(value('换货商品价格'), '¥20.50')
  assert.equal(value('仲裁纠纷'), '客服同意')
  assert.equal(value('仲裁单号'), 'ARBITRATE-1')
  assert.equal(dialog().querySelectorAll('a[aria-label^="查看申请凭证"]').length, 2)
  assert.match(dialog().textContent, /订单创建/)
  assert.match(dialog().textContent, /售后最近更新/)
  assert.match(dialog().textContent, /2026-10-03 12:00:00/)
  assert.doesNotMatch(dialog().textContent, /退款处理/)
})

test('缺失金额和时间使用空态，零值保留且不虚构退款完成', async t => {
  await mountProducts(t, { after_sale_type: 0, after_sale_apply_count: 0 })
  const value = label =>
    [...dialog().querySelectorAll('dt')].find(node => node.textContent === label)?.nextElementSibling?.textContent
  assert.equal(value('售后类型'), '退货退款')
  assert.equal(value('售后件数'), '0')
  assert.equal(value('实际退款'), '-')
  assert.equal(value('售后总金额'), '-')
  assert.match(dialog().textContent, /暂无申请凭证/)
  assert.match(dialog().textContent, /暂无处理时间/)
  assert.doesNotMatch(dialog().textContent, /退款处理|售后完成|换货 SKU/)
})

test('同步范围拒绝缺失、倒序和非法日期，并保留全天时间边界', () => {
  const range = ['2026-10-01 00:00:00', '2026-10-05 23:59:59']
  assert.deepEqual(core.readSyncRange(range), range)
  for (const value of [undefined, [], [range[0]], [range[0], undefined]]) {
    assert.throws(() => core.readSyncRange(value), /完整/)
  }
  assert.throws(() => core.readSyncRange([range[1], range[0]]), /不能晚于/)
  assert.throws(() => core.readSyncRange(['2026-02-30 00:00:00', range[1]]), /有效/)
  assert.throws(() => core.readSyncRange(['2026-10-01', '2026-10-05']), /有效/)
})

test('弹窗使用单个范围字段和标准操作区，空范围不会请求同步，取消重开会清空', async t => {
  const { container, posts } = await mount(t)
  assert.match(dialog().textContent, /不选择店铺时，将同步全部启用的抖店店铺/)
  assert.equal(dialog().querySelectorAll('button[aria-label="同步时间范围"]').length, 1)
  assert.ok(button('取消', dialog()))
  await act(async () => button('提交同步', dialog()).click())
  await until(() => dialog().textContent.includes('请选择同步时间范围'))
  assert.equal(posts.length, 0)
  await selectYesterday()
  await act(async () => button('取消', dialog()).click())
  await until(() => !dialog())
  await act(async () => button('同步数据', container).click())
  await until(() => dialog()?.textContent.includes('请选择售后同步时间范围'))
  assert.equal(posts.length, 0)
})

test('同步按 date 数组传递全天范围，提交中阻止重复请求，成功后关闭并刷新', async t => {
  const { runtime, posts, listCalls } = await mount(t)
  let finish
  runtime.http.post = (url, payload) => {
    posts.push({ url, payload })
    return new Promise(resolve => {
      finish = resolve
    })
  }
  await selectYesterday()
  const before = listCalls()
  const submit = button('提交同步', dialog())
  await act(async () => {
    submit.click()
    submit.click()
  })
  await until(() => posts.length === 1)
  assert.equal(posts[0].url, '/admin/data/aftersale/sync')
  assert.deepEqual(Object.keys(posts[0].payload), ['date', 'shop_ids', 'request_key'])
  assert.match(posts[0].payload.request_key, /^[0-9a-f-]{36}$/)
  assert.deepEqual(posts[0].payload.shop_ids, [])
  assert.match(posts[0].payload.date[0], /^\d{4}-\d{2}-\d{2} 00:00:00$/)
  assert.match(posts[0].payload.date[1], /^\d{4}-\d{2}-\d{2} 23:59:59$/)
  assert.equal(submit.disabled, true)
  await act(async () => submit.click())
  assert.equal(posts.length, 1)
  await act(async () => finish(response()))
  await until(() => !dialog() && listCalls() > before)
})

test('接口失败保留选择并允许重试，不误报同步成功', async t => {
  const { runtime, listCalls } = await mount(t)
  let attempts = 0
  runtime.http.post = async () => {
    attempts++
    if (attempts === 1) return { data: { code: 500, message: '同步服务暂不可用', data: null } }
    if (attempts === 2) throw new Error('网络连接失败')
    return response()
  }
  await selectYesterday()
  const selected = document.querySelector('button[aria-label="同步时间范围"]').textContent
  const before = listCalls()
  for (let attempt = 1; attempt <= 2; attempt++) {
    await act(async () => button('提交同步', dialog()).click())
    await until(() => attempts === attempt && !button('提交同步', dialog()).disabled)
    assert.equal(document.querySelector('button[aria-label="同步时间范围"]').textContent, selected)
    assert.equal(listCalls(), before)
  }
  await act(async () => button('提交同步', dialog()).click())
  await until(() => !dialog())
  assert.equal(attempts, 3)
})

test('店铺支持多选并按原始字符串 ID 提交，取消重开清空店铺选择', async t => {
  const { container, posts, shopCalls } = await mount(t)
  const openShops = async () => {
    await act(async () => document.querySelector('[aria-label="同步店铺"]').click())
    await until(() => document.querySelector('[role="option"]'))
  }
  await openShops()
  for (const name of ['测试店铺甲', '测试店铺乙']) {
    const option = [...document.querySelectorAll('[role="option"]')].find(node => node.textContent.includes(name))
    await act(async () => option.click())
  }
  assert.ok(shopCalls.length > 0)
  assert.equal(shopCalls[0].status, 1)
  await act(async () =>
    document.activeElement.dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  )
  await selectYesterday()
  await act(async () => button('提交同步', dialog()).click())
  await until(() => posts.length === 1 && !dialog())
  assert.deepEqual(posts[0].payload.shop_ids, ['90071992547409931', '90071992547409932'])
  await act(async () => button('同步数据', container).click())
  await until(() => dialog())
  assert.ok(!dialog().textContent.includes('测试店铺甲'))
  assert.ok(!dialog().textContent.includes('测试店铺乙'))
})
