import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'
import { createRuntimeFixture, runtimeExports } from './fixtures/runtime.mjs'

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
const result = await build({
  stdin: {
    contents: `${runtimeExports}\nexport { default as CrontabPage } from './src/plugins/mine-admin/crontab/views/index'`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  define: { 'import.meta.glob': '__testAssetGlob' },
  banner: { js: 'const __testAssetGlob = () => ({})' },
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const core = compiled.exports

after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

async function settle() {
  await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
}

async function mount(
  t,
  { rows = [], permissions = [], logResponse = () => ({ code: 200, data: { list: [], total: 0 } }) } = {},
) {
  const requests = []
  const logRequests = []
  const errors = []
  const rejectWrite = async () => {
    throw new Error('页面刷新不应写入业务数据')
  }
  const fixture = createRuntimeFixture(
    core,
    {
      get: async (url, { params, signal }) => {
        assert.equal(signal.aborted, false)
        if (url === '/admin/plugin/crontab/log/list') {
          logRequests.push({ ...params })
          return { data: await logResponse(params) }
        }
        assert.equal(url, '/admin/plugin/crontab/list')
        requests.push({ ...params })
        return { data: { code: 200, data: { list: rows, total: rows.length } } }
      },
      post: rejectWrite,
      put: rejectWrite,
      patch: rejectWrite,
      delete: rejectWrite,
    },
    error => errors.push(error),
  )
  fixture.runtime.session.setState({ permissions, roles: [], userInfo: null })
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    fixture.runtime.dispose()
    container.remove()
  })
  await act(async () => root.render(fixture.wrap(createElement(core.CrontabPage))))
  await settle()
  assert.deepEqual(requests, [{ page: 1, page_size: 10 }])
  if (!rows.length) assert.match(container.textContent, /暂无定时任务/)
  return { container, requests, logRequests, errors }
}

for (const label of ['重置', '搜索']) {
  test(`定时任务连续点击${label}且条件不变时仍重新请求列表并结束加载`, async t => {
    const { container, requests, errors } = await mount(t)
    const button = [...container.querySelectorAll('button')].find(node => node.textContent.trim() === label)
    assert.ok(button)
    for (let count = 2; count <= 3; count++) {
      await act(async () => button.click())
      await settle()
      assert.equal(requests.length, count)
      assert.deepEqual(requests.at(-1), { page: 1, page_size: 10 })
      assert.match(container.textContent, /暂无定时任务/)
    }
    assert.deepEqual(errors, [])
  })
}

test('定时任务搜索更新条件，重置后只请求默认条件', async t => {
  const { container, requests, errors } = await mount(t)
  const input = container.querySelector('[aria-label="任务名称"]')
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setValue.call(input, '  每日报表  ')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const button = label => [...container.querySelectorAll('button')].find(node => node.textContent.trim() === label)
  await act(async () => button('搜索').click())
  await settle()
  assert.equal(requests.length, 2)
  assert.deepEqual(requests.at(-1), { page: 1, page_size: 10, name: '每日报表' })
  await act(async () => button('重置').click())
  await settle()
  assert.equal(requests.length, 3)
  assert.deepEqual(requests.at(-1), { page: 1, page_size: 10 })
  assert.equal(input.value, '')
  assert.deepEqual(errors, [])
})

const taskRows = [
  {
    id: 7,
    name: '每日报表',
    type: 'class',
    rule: '0 0 10 * * *',
    value: 'App\\Task\\DailyReport',
    memo: '生成经营日报',
    status: 1,
    is_singleton: 1,
    is_on_one_server: 1,
  },
  { id: 8, name: '库存同步' },
]

function button(label, scope = document) {
  return [...scope.querySelectorAll('button')].find(
    node => node.textContent.trim() === label || node.getAttribute('aria-label') === label,
  )
}

async function click(node) {
  assert.ok(node, '应找到操作入口')
  await act(async () => node.click())
  await settle()
}

async function openLogs(name) {
  await click(button(`${name} 的操作`))
  await click([...document.querySelectorAll('[role="menuitem"]')].find(node => node.textContent.trim() === '查看记录'))
  return document.querySelector('[role="dialog"]')
}

test('只读用户可从更多菜单查看当前任务记录，翻页、刷新和切换任务保持正确范围', async t => {
  const { logRequests, errors } = await mount(t, {
    rows: taskRows,
    permissions: ['plugin:mine-admin:crontab:list'],
    logResponse: params => ({
      code: 200,
      data:
        params.crontab_id === 8
          ? { list: [], total: 0 }
          : {
              total: 21,
              list:
                params.page === 2
                  ? [{ id: 21, status: 1, name: '第二页记录', created_at: '2026-10-22 10:00:00' }]
                  : [
                      {
                        id: 1,
                        status: 1,
                        name: '每日报表',
                        target: 'App\\Task\\DailyReport',
                        created_at: '2026-10-23 10:00:00',
                      },
                      {
                        id: 2,
                        status: 0,
                        name: '每日报表',
                        target: 'App\\Task\\DailyReport',
                        exception_info: '连接超时\n请检查服务',
                        created_at: '2026-10-23 09:00:00',
                      },
                      { id: 3, status: 2, name: '每日报表', created_at: '2026-10-23 08:00:00' },
                    ],
            },
    }),
  })
  assert.deepEqual(logRequests, [])
  const drawer = await openLogs('每日报表')
  assert.match(drawer.textContent, /每日报表 - 执行记录/)
  assert.match(drawer.textContent, /成功/)
  assert.match(drawer.textContent, /失败/)
  assert.match(drawer.textContent, /未知/)
  assert.match(drawer.textContent, /连接超时\s*请检查服务/)
  assert.match(drawer.textContent, /App\\Task\\DailyReport/)
  assert.match(drawer.textContent, /2026-10-23 10:00:00/)
  assert.match(
    drawer.querySelector('[aria-label="当前任务配置"]').textContent,
    /执行类方法.*0 0 10 \* \* \*.*单例执行 · 单服务器/,
  )
  assert.match(drawer.textContent, /生成经营日报/)
  assert.deepEqual(logRequests, [{ crontab_id: 7, page: 1, page_size: 20 }])
  await click(button('下一页', drawer))
  assert.deepEqual(logRequests.at(-1), { crontab_id: 7, page: 2, page_size: 20 })
  assert.match(drawer.textContent, /第二页记录/)
  await click(button('刷新', drawer))
  assert.equal(logRequests.length, 3)
  assert.deepEqual(logRequests.at(-1), { crontab_id: 7, page: 2, page_size: 20 })
  await click(button('关闭', drawer))
  const nextDrawer = await openLogs('库存同步')
  assert.match(nextDrawer.textContent, /库存同步 - 执行记录/)
  assert.match(nextDrawer.textContent, /暂无执行记录/)
  assert.doesNotMatch(nextDrawer.textContent, /第二页记录/)
  assert.deepEqual(logRequests.at(-1), { crontab_id: 8, page: 1, page_size: 20 })
  assert.deepEqual(errors, [])
})

test('结果筛选从第一页查询，刷新保留筛选，全部记录清除筛选', async t => {
  const { logRequests } = await mount(t, {
    rows: taskRows,
    permissions: ['plugin:mine-admin:crontab:list'],
    logResponse: params => ({ code: 200, data: { list: [], total: params.status === undefined ? 40 : 0 } }),
  })
  const drawer = await openLogs('每日报表')
  await click(button('下一页', drawer))
  assert.equal(logRequests.at(-1).page, 2)
  await click([...drawer.querySelectorAll('[role="tab"]')].find(node => node.textContent === '执行失败'))
  assert.deepEqual(logRequests.at(-1), { crontab_id: 7, status: 0, page: 1, page_size: 20 })
  assert.match(drawer.textContent, /暂无失败记录/)
  await click(button('刷新', drawer))
  assert.deepEqual(logRequests.at(-1), { crontab_id: 7, status: 0, page: 1, page_size: 20 })
  await click([...drawer.querySelectorAll('[role="tab"]')].find(node => node.textContent === '执行成功'))
  assert.deepEqual(logRequests.at(-1), { crontab_id: 7, status: 1, page: 1, page_size: 20 })
  await click([...drawer.querySelectorAll('[role="tab"]')].find(node => node.textContent === '全部记录'))
  assert.deepEqual(logRequests.at(-1), { crontab_id: 7, page: 1, page_size: 20 })
  await click(button('关闭', drawer))
  const nextDrawer = await openLogs('库存同步')
  assert.equal(nextDrawer.querySelector('[role="tab"][aria-selected="true"]').textContent, '全部记录')
  assert.deepEqual(logRequests.at(-1), { crontab_id: 8, page: 1, page_size: 20 })
})

test('展开记录保留完整异常和历史目标，复制使用原始内容', async t => {
  const exception =
    'RuntimeException: 连接超时\n' + '#0 App\\Report\\Daily->run()\n'.repeat(80) + '<script>不执行</script>'
  const target = 'App\\Report\\HistoricalDaily::run'
  const { logRequests } = await mount(t, {
    rows: taskRows,
    permissions: ['plugin:mine-admin:crontab:list'],
    logResponse: () => ({
      code: 200,
      data: {
        list: [
          {
            id: 99,
            crontab_id: 7,
            name: '旧任务名称',
            status: 0,
            target,
            exception_info: exception,
            created_at: '2026-10-24 10:00:00',
          },
        ],
        total: 1,
      },
    }),
  })
  const drawer = await openLogs('每日报表')
  assert.equal(drawer.querySelector('[aria-label="执行记录 99 详情"]'), null)
  await click(drawer.querySelector('[data-slot="data-grid-table-row-expand"] button'))
  const details = drawer.querySelector('[aria-label="执行记录 99 详情"]')
  assert.ok(details)
  assert.equal(details.querySelectorAll('pre')[1].textContent, exception)
  assert.match(details.textContent, /旧任务名称/)
  assert.equal(details.querySelector('script'), null)
  assert.equal(logRequests.length, 1, '展开使用已加载的记录，不额外请求')
  await click(button('复制异常', details))
  assert.equal(await navigator.clipboard.readText(), exception)
  await click(button('复制本条记录', details))
  const copied = await navigator.clipboard.readText()
  assert.ok(copied.includes(target))
  assert.ok(copied.includes(exception))
  assert.ok(copied.includes('任务 ID：7'))
})

test('记录加载失败显示错误，刷新后可以恢复', async t => {
  let failed = true
  const { logRequests } = await mount(t, {
    rows: taskRows,
    permissions: ['plugin:mine-admin:crontab:list'],
    logResponse: () =>
      failed ? { code: 500, message: '执行记录暂时无法读取' } : { code: 200, data: { list: [], total: 0 } },
  })
  const drawer = await openLogs('每日报表')
  for (let attempt = 0; attempt < 100 && !drawer.textContent.includes('执行记录暂时无法读取'); attempt++) await settle()
  assert.match(drawer.textContent, /执行记录暂时无法读取/)
  const failedRequests = logRequests.length
  failed = false
  await click(button('刷新', drawer))
  assert.equal(logRequests.length, failedRequests + 1)
  assert.match(drawer.textContent, /暂无执行记录/)
  assert.doesNotMatch(drawer.textContent, /执行记录暂时无法读取/)
})

test('缺少列表权限时更多菜单不暴露查看记录入口', async t => {
  const { logRequests } = await mount(t, { rows: taskRows, permissions: ['plugin:mine-admin:crontab:save'] })
  await click(button('每日报表 的操作'))
  const items = [...document.querySelectorAll('[role="menuitem"]')]
  assert.ok(items.some(node => node.textContent.includes('编辑任务')))
  assert.ok(items.every(node => !node.textContent.includes('查看记录')))
  assert.deepEqual(logRequests, [])
})
