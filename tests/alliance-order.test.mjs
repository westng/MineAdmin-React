import { runtimeExports, createRuntimeFixture } from './fixtures/runtime.mjs'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { after, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'

const pagePath = new URL('../src/modules/alliance/alliance-order/views/index.tsx', import.meta.url)
if (!existsSync(pagePath)) {
  test.skip('联盟订单 CRUD：业务模块未收录时跳过')
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
    {
      id: 11,
      product_id: '7310000000000000011',
      product_name: '测试商品甲',
      product_img: 'https://example.invalid/product.jpg',
      order_id: 'order-11',
      shop_name: '甲店',
    },
    { id: 22, product_id: '7310000000000000022', product_name: '测试商品乙', order_id: 'order-22', shop_name: '乙店' },
  ]
  const success = data => ({ data: { code: 200, data } })
  fixture.http = {
    get: async (url, config) => {
      fixture.reads.push({ url, params: config?.params })
      return success({ list: fixture.rows, total: fixture.rows.length })
    },
    ...Object.fromEntries(
      ['post', 'put', 'delete'].map(method => [
        method,
        (url, data, config) =>
          new Promise((resolve, reject) => {
            fixture.writes.push({
              method,
              url,
              data,
              config,
              resolve: (response = success(null)) => resolve(response),
              reject,
            })
          }),
      ]),
    ),
  }
  const bundle = await build({
    stdin: {
      contents:
        runtimeExports +
        `
          export { TableCellRenderersContext } from './src/components/ma-table'
          export { ProTableToolbarsContext } from './src/components/ma-pro-table'
          export { MaRemoteSelectProvider } from './src/components/ma-remote-select'
          export { default as cellPlugin } from './src/plugins/west/cell-enhance'
          export { default as importExportPlugin } from './src/plugins/west/importExportPro'
          export { createApi } from './src/modules/alliance/alliance-order/api'
          export { default } from '${fileURLToPath(pagePath)}'
        `,
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    plugins: [
      {
        name: 'alliance-order-local-fixtures',
        setup(builder) {
          builder.onResolve({ filter: /^@\/provider\/http$/ }, () => ({ path: 'http', namespace: 'fixture' }))
          builder.onResolve({ filter: /^@\/hooks\/auth\/use-permission$/ }, () => ({
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
  const runtimeFixture = createRuntimeFixture(compiled.exports, fixture.http, event =>
    fixture.messages.push({ ...event, type: event.kind }),
  )
  compiled.exports.cellPlugin.install(runtimeFixture.runtime)
  compiled.exports.importExportPlugin.install(runtimeFixture.runtime)
  const Page = compiled.exports.default
  window.addEventListener('mine:message', event => fixture.messages.push(event.detail))
  window.confirm = () => {
    throw new Error('标准 CRUD 不应调用原生 confirm')
  }
  beforeEach(() => {
    fixture.rows = rows
    fixture.permissions = new Set(
      ['list', 'delete', 'sync', 'import', 'export', 'downloadTemplate'].map(
        name => `data:unionSettlementOrder:${name}`,
      ),
    )
    runtimeFixture.runtime.query.clear()
    fixture.reads.length = 0
    fixture.writes.length = 0
    fixture.messages.length = 0
  })
  after(async () => {
    runtimeFixture.runtime.dispose()
    await dom.happyDOM.abort()
    dom.close()
  })

  async function mount(t) {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const render = () =>
      act(async () =>
        root.render(
          runtimeFixture.wrap(
            createElement(
              compiled.exports.ProTableToolbarsContext.Provider,
              { value: runtimeFixture.runtime.proTableToolbars },
              createElement(
                compiled.exports.TableCellRenderersContext.Provider,
                { value: runtimeFixture.runtime.tableCellRenderers },
                createElement(
                  compiled.exports.MaRemoteSelectProvider,
                  { request: async () => ({ list: [], total: 0 }) },
                  createElement(Page),
                ),
              ),
            ),
          ),
        ),
      )
    t.after(async () => {
      await act(async () => root.unmount())
      container.remove()
    })
    await render()
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 15))
    })
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
  const firstRow = () => document.querySelector('tbody tr')

  const listReads = () => fixture.reads.filter(read => read.url === '/admin/data/unionSettlementOrder/list')
  const settle = async callback =>
    act(async () => {
      callback()
      await new Promise(resolve => setTimeout(resolve, 30))
    })

  test('无查看权限时不请求列表，也不显示写操作', async t => {
    fixture.permissions.delete('data:unionSettlementOrder:list')
    const { container } = await mount(t)
    assert.match(container.textContent, /暂无联盟订单查看权限/)
    assert.equal(fixture.reads.length, 0)
    assert.equal(button('同步数据', container), undefined)
    assert.equal(button('导入', container), undefined)
    assert.equal(button('导出', container), undefined)
  })

  test('MaProTable 管理分页搜索，商品列通过插件显示图片、名称和商品 ID', async t => {
    const { container } = await mount(t)
    assert.equal(listReads()[0].params.page, 1)
    assert.equal(listReads()[0].params.page_size, 20)
    assert.match(firstRow().textContent, /测试商品甲/)
    assert.equal(
      firstRow().querySelector('[data-slot="product-id"]').textContent.trim(),
      `商品ID：${rows[0].product_id}`,
    )
    assert.equal(firstRow().querySelector('[data-slot="product-image"] img').getAttribute('src'), rows[0].product_img)
    assert.ok(button('复制商品ID', firstRow()))
    const cache = runtimeFixture.runtime.query.getQueryCache().getAll()
    assert.ok(cache.some(query => query.queryKey[2] === 'alliance' && query.queryKey[3] === 'alliance-order'))
    await enter(container.querySelector('#order_id'), 'order-22')
    await click(button('搜索', container))
    assert.equal(listReads().at(-1).params.order_id, 'order-22')
  })

  test('下单来源和流量渠道通过单元格插件显示字典徽章，兼容数字并保留未知值', async t => {
    const cases = [
      { source: 1128, sourceLabel: '抖音', channel: 'shop_list', channelLabel: '橱窗' },
      { source: '2329', sourceLabel: '抖音极速版', channel: 'video', channelLabel: '视频' },
      { source: 1112, sourceLabel: '火山', channel: 'live', channelLabel: '直播' },
      { source: 32, sourceLabel: '西瓜', channel: 'others', channelLabel: '其他' },
      { source: 13, sourceLabel: '头条', channel: 'others', channelLabel: '其他' },
      { source: 9999, sourceLabel: '9999', channel: 'unknown-channel', channelLabel: 'unknown-channel' },
    ]
    fixture.rows = cases.map((item, index) => ({
      ...rows[0],
      id: index + 1,
      buyer_app_id: item.source,
      media_type: item.channel,
    }))
    const sourceOptions = cases.slice(0, 5).map(item => ({ value: String(item.source), label: item.sourceLabel }))
    const disposeSource = runtimeFixture.runtime.dictionaries.register('alliance-buyer-app', sourceOptions)
    const disposeChannel = runtimeFixture.runtime.dictionaries.register(
      'alliance-media-type',
      cases.slice(0, 4).map(item => ({ value: item.channel, label: item.channelLabel })),
    )
    const { container } = await mount(t)
    t.after(() => {
      disposeSource()
      disposeChannel()
    })
    const tableRows = [...container.querySelectorAll('tbody tr')]
    assert.equal(tableRows.length, cases.length)
    cases.forEach((item, index) => {
      const badges = [...tableRows[index].querySelectorAll('[data-slot="badge"]')].map(node => node.textContent)
      assert.ok(badges.includes(item.sourceLabel), `下单来源 ${item.source} 应显示 ${item.sourceLabel}`)
      assert.ok(badges.includes(item.channelLabel), `流量渠道 ${item.channel} 应显示 ${item.channelLabel}`)
    })
    const readsBeforeUpdate = listReads().length
    let disposeUpdate
    await act(async () => {
      disposeUpdate = runtimeFixture.runtime.dictionaries.register(
        'alliance-buyer-app',
        sourceOptions.map(item => (item.value === '1128' ? { ...item, label: '抖音（字典更新）' } : item)),
        true,
      )
    })
    t.after(() => disposeUpdate())
    assert.match(tableRows[0].textContent, /抖音（字典更新）/)
    assert.equal(listReads().length, readsBeforeUpdate)
  })

  test('只有查看权限时保留列表并隐藏删除、同步和选择入口', async t => {
    fixture.permissions = new Set(['data:unionSettlementOrder:list'])
    const { container } = await mount(t)
    assert.match(container.textContent, /测试商品甲/)
    assert.equal(button('批量删除', container), undefined)
    assert.equal(button('删除', firstRow()), undefined)
    assert.equal(button('同步数据', container), undefined)
    assert.equal(button('导入', container), undefined)
    assert.equal(button('导出', container), undefined)
    assert.equal(firstRow().querySelector('[role="checkbox"]'), null)
  })

  test('插件按权限注入导入导出，权限变更即时生效，模板使用联盟订单接口', async t => {
    const { container, render } = await mount(t)
    for (const name of ['导入', '导出']) {
      assert.equal([...container.querySelectorAll('button')].filter(node => node.textContent.trim() === name).length, 1)
    }
    fixture.permissions.delete('data:unionSettlementOrder:import')
    await render()
    assert.equal(button('导入', container), undefined)
    assert.ok(button('导出', container))

    fixture.permissions.add('data:unionSettlementOrder:import')
    fixture.permissions.delete('data:unionSettlementOrder:export')
    fixture.permissions.delete('data:unionSettlementOrder:downloadTemplate')
    await render()
    assert.equal(button('导出', container), undefined)
    await click(button('导入', container))
    assert.equal(button('下载导入模板', dialog()).disabled, true)
    assert.equal(fixture.writes.length, 0)

    fixture.permissions.add('data:unionSettlementOrder:downloadTemplate')
    await render()
    assert.equal(button('下载导入模板', dialog()).disabled, false)
    t.mock.method(dom.HTMLAnchorElement.prototype, 'click', () => {})
    await click(button('下载导入模板', dialog()))
    const request = fixture.writes.at(-1)
    assert.equal(request.url, '/admin/data/unionSettlementOrder/downloadTemplate')
    assert.equal(request.config.responseType, 'blob')
    await settle(() => request.resolve({ data: new Blob(['template']) }))
    assert.equal(fixture.messages.filter(event => event.type === 'error').length, 0)
  })

  for (const mode of ['sync', 'async']) {
    test(`导出使用 DTO 字段和已应用筛选，不携带分页或未提交筛选（${mode}）`, async t => {
      const { container } = await mount(t)
      await enter(container.querySelector('#order_id'), 'order-22')
      await click(button('搜索', container))
      await enter(container.querySelector('#order_id'), '未提交的订单号')
      await click(button('导出', container))
      const fieldsRequest = fixture.writes.at(-1)
      assert.equal(fieldsRequest.url, '/admin/data/unionSettlementOrder/exportFields')
      await settle(() =>
        fieldsRequest.resolve(
          success([
            { key: 'order_id', label: '订单号' },
            { key: 'product_id', label: '商品ID' },
          ]),
        ),
      )
      if (mode === 'sync') {
        const label = [...dialog().querySelectorAll('label')].find(node => node.textContent.trim() === '同步')
        await click(label.querySelector('input'))
        t.mock.method(dom.HTMLAnchorElement.prototype, 'click', () => {})
      }
      await click(button('开始导出', dialog()))
      const request = fixture.writes.at(-1)
      assert.equal(request.url, '/admin/data/unionSettlementOrder/export')
      assert.equal(request.data.order_id, 'order-22')
      assert.equal('page' in request.data, false)
      assert.equal('page_size' in request.data, false)
      assert.deepEqual(request.data.fields, ['order_id', 'product_id'])
      assert.equal(request.data.mode, mode)
      assert.equal(request.config.responseType, mode === 'sync' ? 'blob' : 'json')
      assert.equal(request.data.file_type, 'xlsx')
      assert.match(request.data.task_name, /^联盟订单_/)
      await settle(() => request.resolve(mode === 'sync' ? { data: new Blob(['export']) } : success({ id: 1 })))
      assert.ok(fixture.messages.some(event => event.message === (mode === 'sync' ? '导出成功' : '导出任务已提交')))
    })

    test(`导入通过插件上传文件，提交成功后刷新联盟订单列表（${mode}）`, async t => {
      const { container } = await mount(t)
      await click(button('导入', container))
      const input = dialog().querySelector('input[type="file"]')
      const file = new File(['订单号,商品ID\norder-33,7310000000000000033'], 'alliance-orders.csv', {
        type: 'text/csv',
      })
      Object.defineProperty(input, 'files', { configurable: true, value: [file] })
      await act(async () => input.dispatchEvent(new dom.Event('change', { bubbles: true })))
      if (mode === 'sync') {
        await click(
          [...dialog().querySelectorAll('[role="radio"]')].find(node => node.textContent.includes('同步执行')),
        )
      }
      const readsBeforeImport = listReads().length
      await click(button('开始导入', dialog()))
      const request = fixture.writes.at(-1)
      assert.equal(request.url, '/admin/data/unionSettlementOrder/import')
      assert.equal(request.data.get('file').name, 'alliance-orders.csv')
      assert.equal(request.data.get('mode'), mode)
      assert.equal(request.config.headers['Content-Type'], 'multipart/form-data')
      assert.equal(listReads().length, readsBeforeImport)
      await settle(() => request.resolve(success({ id: 2 })))
      assert.equal(listReads().length, readsBeforeImport + 1)
      assert.ok(fixture.messages.some(event => event.message === (mode === 'sync' ? '导入成功' : '导入任务已提交')))
    })
  }

  test('删除阻止重复提交，业务失败保留弹窗，重试成功刷新列表', async t => {
    await mount(t)
    await click(button('删除', firstRow()))
    await click(button('删除', dialog()))
    await click(button('删除', dialog()))
    assert.equal(fixture.writes.length, 1)
    assert.equal(fixture.writes[0].method, 'delete')
    assert.deepEqual(fixture.writes[0].data, { data: [11] })
    await settle(() => fixture.writes[0].resolve({ data: { code: 403, message: '不能删除此订单' } }))
    assert.ok(dialog())
    assert.ok(fixture.messages.some(message => message.kind === 'error' && message.message === '不能删除此订单'))
    assert.equal(
      fixture.messages.some(message => message.kind === 'success'),
      false,
    )
    const before = listReads().length
    await click(button('删除', dialog()))
    await settle(() => fixture.writes[1].resolve())
    assert.equal(dialog(), null)
    assert.ok(listReads().length > before)
    assert.ok(fixture.messages.some(message => message.kind === 'success' && message.message === '删除成功'))
  })

  test('删除确认后权限被撤销时不提交请求', async t => {
    await mount(t)
    await click(button('删除', firstRow()))
    fixture.permissions.delete('data:unionSettlementOrder:delete')
    await click(button('删除', dialog()))
    assert.equal(fixture.writes.length, 0)
  })

  test('同步弹窗校验时间，保留全部店铺语义，防重复提交并在成功后刷新', async t => {
    await mount(t)
    await click(button('同步数据'))
    await click(button('提交同步', dialog()))
    assert.equal(fixture.writes.length, 0)
    assert.match(dialog().textContent, /请选择同步时间范围/)
    await click(button('同步时间范围', dialog()))
    await click(button('昨天'))
    await click(button('提交同步', dialog()))
    await click(button('提交同步', dialog()))
    assert.equal(fixture.writes.length, 1)
    const write = fixture.writes[0]
    assert.equal(write.url, '/admin/data/unionSettlementOrder/sync')
    assert.deepEqual(write.data.shop_ids, [])
    assert.match(write.data.data[0], /^\d{4}-\d{2}-\d{2} 00:00:00$/)
    assert.match(write.data.data[1], /^\d{4}-\d{2}-\d{2} 23:59:59$/)
    const before = listReads().length
    await settle(() => write.resolve())
    assert.equal(dialog(), null)
    assert.ok(listReads().length > before)
    assert.ok(fixture.messages.some(message => message.message === '同步任务已提交'))
    await click(button('同步数据'))
    await click(button('提交同步', dialog()))
    assert.equal(fixture.writes.length, 1)
    assert.match(dialog().textContent, /请选择同步时间范围/)
  })

  test('资源写入失败不失效缓存，成功后失效相同列表资源', async () => {
    const api = compiled.exports.createApi(runtimeFixture.runtime)
    const options = api.page.queryOptions({ page: 1, page_size: 20 })
    await runtimeFixture.runtime.query.fetchQuery(options)
    const failed = assert.rejects(api.remove([11]), /删除失败/)
    fixture.writes[0].resolve({ data: { code: 500 } })
    await failed
    assert.equal(runtimeFixture.runtime.query.getQueryState(options.queryKey).isInvalidated, false)
    const successful = api.sync({ data: ['2026-09-01 00:00:00', '2026-09-02 23:59:59'], shop_ids: ['101'] })
    fixture.writes[1].resolve()
    await successful
    assert.equal(runtimeFixture.runtime.query.getQueryState(options.queryKey).isInvalidated, true)
  })
}
