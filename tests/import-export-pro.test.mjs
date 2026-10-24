import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { after, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'
import { runtimeExports, createRuntimeFixture } from './fixtures/runtime.mjs'

if (!existsSync(new URL('../src/plugins/west/importExportPro/index.ts', import.meta.url))) {
  test.skip('导入导出任务：当前仓库未安装本地插件')
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
  const listPath = '/admin/import-export-pro/task/list'
  const rows = [
    {
      id: 1,
      task_name: '联盟订单导出甲',
      task_type: 'export',
      status: 'success',
      file_type: 'xlsx',
      result_file_name: 'orders.xlsx',
      total_count: 10,
      creator: { nickname: '测试用户' },
    },
    { id: 2, task_name: '联盟订单导入乙', task_type: 'import', status: 'processing', file_type: 'csv', total_count: 5 },
  ]
  const success = data => ({ data: { code: 200, data } })
  const fixture = {
    permissions: new Set(),
    reads: [],
    writes: [],
    details: [],
    messages: [],
    postResponse: null,
    downloadResponse: null,
  }
  const http = {
    async get(url, config) {
      fixture.reads.push({
        url,
        params: config?.params,
        signal: config?.signal,
        adapter: config?.adapter,
        responseType: config?.responseType,
        timeout: config?.timeout,
      })
      if (url === listPath) return success({ list: rows, total: 45 })
      if (url.endsWith('/download')) {
        const response = await (fixture.downloadResponse ?? { data: new Blob(['file']) })
        return response.data instanceof Blob
          ? { ...response, data: response.data.stream(), headers: { 'content-type': response.data.type } }
          : response
      }
      return new Promise((resolve, reject) => fixture.details.push({ url, signal: config?.signal, resolve, reject }))
    },
    async post(url, body, config) {
      fixture.writes.push({ url, body, config })
      return fixture.postResponse ?? success({ id: 3 })
    },
  }
  const bundle = await build({
    stdin: {
      contents:
        runtimeExports +
        [
          "export { default as TaskPage } from './src/plugins/west/importExportPro/views'",
          "export { createApi } from './src/plugins/west/importExportPro/api'",
          "export { saveTaskFile } from './src/plugins/west/importExportPro/api/download'",
          "export { TableRequestContext } from './src/components/ma-pro-table'",
          "export { createTableRequestStore } from './src/provider/query/table-adapter'",
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
        name: 'task-permissions',
        setup(builder) {
          builder.onResolve({ filter: /^@\/hooks\/auth\/use-permission$/ }, () => ({
            path: 'permissions',
            namespace: 'fixture',
          }))
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            contents: 'export const usePermission = () => ({ hasAuth: code => __fixture.permissions.has(code) })',
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
  const runtimeFixture = createRuntimeFixture(compiled.exports, http, event => fixture.messages.push(event))
  const { runtime } = runtimeFixture
  runtime.query.setDefaultOptions({ queries: { retry: false } })
  const api = compiled.exports.createApi(runtime)
  const tableRequests = id =>
    compiled.exports.createTableRequestStore(runtime.query, () => runtime.session.getState().sessionVersion, id)
  beforeEach(() => {
    runtime.query.clear()
    fixture.permissions = new Set(
      ['list', 'detail', 'download'].map(action => 'plugin:west:importExportPro:task:' + action),
    )
    fixture.reads.length = fixture.writes.length = fixture.details.length = fixture.messages.length = 0
    fixture.postResponse = fixture.downloadResponse = null
  })
  after(async () => {
    runtime.dispose()
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
              compiled.exports.TableRequestContext.Provider,
              { value: tableRequests },
              createElement(compiled.exports.TaskPage),
            ),
          ),
        ),
      )
    t.after(async () => {
      await act(async () => root.unmount())
      container.remove()
    })
    await render()
    await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
    return { container, render }
  }
  const listReads = () => fixture.reads.filter(read => read.url === listPath)
  const dialog = () => document.querySelector('[role="dialog"]')
  function button(text, scope = document) {
    return [...scope.querySelectorAll('button')].find(
      node => node.textContent.trim() === text || node.getAttribute('aria-label') === text,
    )
  }
  async function click(element) {
    assert.ok(element, '应找到可点击控件')
    await act(async () => element.click())
  }
  async function enter(input, value) {
    assert.ok(input, '应找到输入字段')
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new dom.Event('input', { bubbles: true }))
    })
  }
  async function select(container, prop, label) {
    await click(container.querySelector('#' + prop))
    await click([...document.querySelectorAll('[role="option"]')].find(option => option.textContent.trim() === label))
  }
  async function settle(callback) {
    await act(async () => {
      callback()
      await new Promise(resolve => setTimeout(resolve, 20))
    })
  }

  test('任务列表权限不足时不请求，只有列表权限时不显示详情和下载', async t => {
    fixture.permissions.clear()
    const { container, render } = await mount(t)
    assert.equal(fixture.reads.length, 0)
    assert.match(container.textContent, /暂无导入导出任务查看权限/)
    fixture.permissions.add('plugin:west:importExportPro:task:list')
    await render()
    await settle(() => {})
    assert.match(container.textContent, /联盟订单导出甲/)
    assert.equal(button('详情', container), undefined)
    assert.equal(button('下载', container), undefined)
  })

  test('搜索 TSX 配置发送四项后端筛选，搜索和重置返回第一页并共用任务资源键', async t => {
    const { container } = await mount(t)
    await click(button('下一页', container))
    assert.equal(listReads().at(-1).params.page, 2)
    await enter(container.querySelector('#task_name'), '联盟订单')
    await select(container, 'task_type', '导出')
    await select(container, 'status', '处理中')
    await select(container, 'file_type', 'Excel（xlsx）')
    await click(button('搜索', container))
    assert.deepEqual(listReads().at(-1).params, {
      task_name: '联盟订单',
      task_type: 'export',
      status: 'processing',
      file_type: 'xlsx',
      page: 1,
      page_size: 20,
    })
    assert.ok(
      runtime.query
        .getQueryCache()
        .getAll()
        .some(query => query.queryKey[2] === 'import-export-pro' && query.queryKey[3] === 'tasks'),
    )
    await click(button('重置', container))
    const reset = listReads().at(-1).params
    assert.equal(reset.page, 1)
    for (const key of ['task_name', 'task_type', 'status', 'file_type']) assert.equal(reset[key] ?? '', '')
  })

  test('关闭详情取消读取，迟到响应不重新打开，也不覆盖新任务', async t => {
    const { container } = await mount(t)
    const tableRows = container.querySelectorAll('tbody tr')
    await click(button('详情', tableRows[0]))
    const first = fixture.details.at(-1)
    assert.equal(first.url, '/admin/import-export-pro/task/1')
    await click(button('关闭', dialog()))
    assert.equal(first.signal.aborted, true)
    assert.equal(dialog(), null)
    await click(button('详情', tableRows[1]))
    const second = fixture.details.at(-1)
    await settle(() => second.resolve(success({ ...rows[1], task_name: '第二个任务的最新详情' })))
    await settle(() => first.resolve(success({ ...rows[0], task_name: '第一个任务的迟到详情' })))
    assert.match(dialog().textContent, /第二个任务的最新详情/)
    assert.doesNotMatch(dialog().textContent, /第一个任务的迟到详情/)
    await click(button('关闭', dialog()))
    assert.equal(dialog(), null)
  })

  test('详情权限撤销立即关闭并取消请求', async t => {
    const { container, render } = await mount(t)
    await click(button('详情', container.querySelector('tbody tr')))
    const request = fixture.details.at(-1)
    fixture.permissions.delete('plugin:west:importExportPro:task:detail')
    await render()
    assert.equal(request.signal.aborted, true)
    assert.equal(dialog(), null)
    await settle(() => request.resolve(success(rows[0])))
    assert.equal(dialog(), null)
    fixture.permissions.add('plugin:west:importExportPro:task:detail')
    await render()
    assert.equal(dialog(), null)
  })

  test('下载撤权取消请求，重新授权可再次下载，旧响应不会保存文件', async t => {
    const saved = []
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    const originalClick = dom.HTMLAnchorElement.prototype.click
    URL.createObjectURL = blob => {
      saved.push(blob)
      return 'blob:test'
    }
    URL.revokeObjectURL = () => {}
    dom.HTMLAnchorElement.prototype.click = () => {}
    t.after(() => {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      dom.HTMLAnchorElement.prototype.click = originalClick
    })

    let resolveOld
    fixture.downloadResponse = new Promise(resolve => (resolveOld = resolve))
    const { container, render } = await mount(t)
    await click(button('下载', container))
    const oldRequest = fixture.reads.find(read => read.url.endsWith('/download'))
    assert.equal(oldRequest.signal.aborted, false)
    assert.equal(oldRequest.adapter, 'fetch')
    assert.equal(oldRequest.responseType, 'stream')
    assert.equal(oldRequest.timeout, 0)
    fixture.permissions.delete('plugin:west:importExportPro:task:download')
    await render()
    assert.equal(oldRequest.signal.aborted, true)

    let resolveNew
    fixture.downloadResponse = new Promise(resolve => (resolveNew = resolve))
    fixture.permissions.add('plugin:west:importExportPro:task:download')
    await render()
    await click(button('下载', container))
    assert.equal(fixture.reads.filter(read => read.url.endsWith('/download')).length, 2)
    await settle(() => resolveOld({ data: new Blob(['old']) }))
    assert.equal(saved.length, 0)
    const latest = new Blob(['latest'])
    await settle(() => resolveNew({ data: latest }))
    assert.equal(saved.length, 1)
    assert.equal(await saved[0].text(), 'latest')
  })

  test('导入导出成功自动刷新已挂载任务列表，业务失败保留现有列表', async t => {
    await mount(t)
    const before = listReads().length
    await act(async () => api.importFile('/business/import', new FormData()))
    assert.equal(listReads().length, before + 1)
    const payload = { mode: 'async', file_type: 'xlsx', task_name: '测试导出', fields: ['id'] }
    await act(async () => api.exportFile('/business/export', payload))
    assert.equal(listReads().length, before + 2)
    fixture.postResponse = { data: { code: 422, message: '导入数据校验失败', data: null } }
    await act(async () => assert.rejects(api.importFile('/business/import', new FormData()), /导入数据校验失败/))
    assert.equal(listReads().length, before + 2)
  })

  test('同步导出 JSON 错误不失效任务缓存，任务文件下载拒绝错误和空文件', async () => {
    const key = api.listTasks.queryOptions({ page: 1 }).queryKey
    runtime.query.setQueryData(key, success({ list: rows, total: 2 }))
    fixture.postResponse = {
      data: new Blob([JSON.stringify({ code: 422, message: '导出数量超限' })], { type: 'application/json' }),
    }
    await assert.rejects(
      api.exportFile(
        '/business/export',
        { mode: 'sync', file_type: 'xlsx', task_name: '导出', fields: ['id'] },
        'blob',
      ),
      /导出数量超限/,
    )
    assert.equal(runtime.query.getQueryState(key).isInvalidated, false)
    fixture.downloadResponse = {
      data: new Blob([JSON.stringify({ code: 403, message: '没有下载权限' })], { type: 'application/json' }),
    }
    await assert.rejects(
      compiled.exports.saveTaskFile('task.xlsx', () => api.downloadTask(1), new AbortController().signal),
      /没有下载权限/,
    )
    fixture.downloadResponse = { data: new Blob([]) }
    await assert.rejects(
      compiled.exports.saveTaskFile('task.xlsx', () => api.downloadTask(1), new AbortController().signal),
      /下载文件为空/,
    )
  })

  test('支持保存文件时按块写入，取消下载会中止文件和响应流', async t => {
    const originalPicker = dom.showSaveFilePicker
    t.after(() => {
      dom.showSaveFilePicker = originalPicker
    })
    let written = 0
    let closed = 0
    let aborted = 0
    let cancelled = false
    const controller = new AbortController()
    dom.showSaveFilePicker = async () => ({
      createWritable: async () => ({
        async write(chunk) {
          written += chunk.byteLength
          if (written === 3 * 65536) controller.abort()
        },
        async close() {
          closed++
        },
        async abort() {
          aborted++
        },
      }),
    })
    const stream = new ReadableStream({
      pull(source) {
        source.enqueue(new Uint8Array(65536))
      },
      cancel() {
        cancelled = true
      },
    })
    await assert.rejects(
      compiled.exports.saveTaskFile('large.csv', async () => ({ data: stream }), controller.signal),
      error => error.name === 'AbortError',
    )
    assert.equal(written, 3 * 65536)
    assert.equal(closed, 0)
    assert.ok(aborted > 0)
    assert.equal(cancelled, true)
  })

  test('兼容下载在读取超大文件前拒绝，JSONL 附件可流式保存', async t => {
    let cancelled = false
    const oversized = new ReadableStream({
      cancel() {
        cancelled = true
      },
    })
    await assert.rejects(
      compiled.exports.saveTaskFile(
        'large.csv',
        async () => ({ data: oversized, headers: { 'content-length': 33 * 1024 * 1024 } }),
        new AbortController().signal,
      ),
      /32 MiB/,
    )
    assert.equal(cancelled, true)

    let unknownCancelled = false
    let produced = 0
    const chunk = new Uint8Array(1024 * 1024)
    const unknownSize = new ReadableStream({
      pull(source) {
        produced++
        source.enqueue(chunk)
      },
      cancel() {
        unknownCancelled = true
      },
    })
    await assert.rejects(
      compiled.exports.saveTaskFile('unknown.csv', async () => ({ data: unknownSize }), new AbortController().signal),
      /32 MiB/,
    )
    assert.equal(unknownCancelled, true)
    assert.ok(produced <= 34, '超出上限后停止读取未知长度响应')

    const originalPicker = dom.showSaveFilePicker
    const written = []
    let closed = false
    dom.showSaveFilePicker = async () => ({
      createWritable: async () => ({
        async write(chunk) {
          written.push(new TextDecoder().decode(chunk))
        },
        async close() {
          closed = true
        },
        async abort() {},
      }),
    })
    t.after(() => {
      dom.showSaveFilePicker = originalPicker
    })
    await compiled.exports.saveTaskFile(
      'result.jsonl',
      async () => ({
        data: new Blob(['{"id":1}\n']).stream(),
        headers: { 'content-type': 'application/json', 'content-disposition': 'attachment; filename=result.jsonl' },
      }),
      new AbortController().signal,
    )
    assert.equal(written.join(''), '{"id":1}\n')
    assert.equal(closed, true)
  })
}
