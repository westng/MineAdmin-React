import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, beforeEach, test } from 'node:test'
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
const uid = '9876543210987654321'
const row = {
  id: 23,
  aweme_id: uid,
  aweme_name: '原昵称',
  platform: 'DY',
  performance_id: 'live',
  business_id: '7',
  leader_id: 'leader',
  business: { id: 7, nickname: '商务甲' },
}
const calls = []
const messages = []
const response = data => ({ data: { code: 200, data } })
let getProfile
let putRecord
let getLogs
const fixture = {
  env: {},
  permissions: [],
  roles: [],
  row,
  latestRows: [row],
  tables: new Map(),
  refreshes: 0,
  table: {
    setTableColumns() {},
    setProTableOptions() {},
    refresh: async () => {
      fixture.refreshes++
    },
  },
  http: {
    get: async (url, config) => {
      calls.push({ method: 'get', url, config })
      if (url.endsWith('/get_user_info')) return getProfile()
      if (url === '/admin/creator/allocation/list')
        return response({ list: fixture.latestRows, total: fixture.latestRows.length })
      if (url === '/admin/creator/allocationOperationLog/list') return getLogs(config.params)
      throw new Error('未预期的请求：' + url)
    },
    put: async (url, data) => {
      calls.push({ method: 'put', url, data })
      return putRecord()
    },
  },
  toast: (...args) => messages.push(args),
}

const bundled = await build({
  stdin: {
    contents: [
      "export { default as CreatorAllocationPage } from './src/modules/creator/allocation/views'",
      "export * from './src/modules/creator/allocation/api/operations'",
      "export * from './src/modules/creator/allocation/utils/logs'",
      "export { default as getLogColumns } from './src/modules/creator/allocation/views/data/getLogColumns'",
      "export { useDictStore } from './src/provider/dictionary'",
    ].join('\n'),
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  define: { 'import.meta.env': '__allocationFixture.env' },
  plugins: [
    {
      name: 'allocation-fixtures',
      setup(build) {
        const sources = {
          http: 'export default __allocationFixture.http',
          toast: 'export function useToast() { return { toast: __allocationFixture.toast } }',
          permission: `export function usePermission() { return {
          hasAuth: permission => __allocationFixture.permissions.includes('*') || __allocationFixture.permissions.includes(permission),
          hasRole: role => __allocationFixture.roles.includes(role),
        } }`,
          user: 'export function useSessionStore(selector) { return selector({ userInfo: { id: 7 }, roles: __allocationFixture.roles }) }',
          options: `const options = { users: [{ value: '7', label: '商务甲' }, { value: '8', label: '商务乙' }], categories: [{ value: 'live', label: '直播' }], loading: false, error: '', reload() {} }; export function useAllocationOptions() { return options }`,
          table: `import { createElement, forwardRef, useImperativeHandle } from 'react'
          export const MaProTable = forwardRef(function MaProTable(props, ref) {
            useImperativeHandle(ref, () => __allocationFixture.table, [])
            __allocationFixture.tables.set(props.options.header.mainTitle, props)
            const actions = props.schema.tableColumns.find(column => column.type === 'operation')?.operationConfigure.actions ?? []
            const context = { row: __allocationFixture.row }
            return createElement('div', null, props.toolbarLeft, actions.map(action => createElement('button', {
              key: action.name, disabled: action.disabled?.(context), onClick: () => action.onClick(context),
            }, action.text)))
          })`,
        }
        const replacements = [
          [/^@\/provider\/http$/, 'http'],
          [/^@\/components\/reui\/use-toast$/, 'toast'],
          [/^@\/hooks\/framework\/use-permission$/, 'permission'],
          [/^@\/provider\/session$/, 'user'],
          [/^@\/components\/ma-pro-table$/, 'table'],
          [/\/hooks\/use-allocation-options$/, 'options'],
        ]
        for (const [filter, path] of replacements)
          build.onResolve({ filter }, () => ({ path, namespace: 'allocation-fixture' }))
        build.onLoad({ filter: /.*/, namespace: 'allocation-fixture' }, args => ({
          contents: sources[args.path],
          resolveDir: fileURLToPath(new URL('../', import.meta.url)),
        }))
      },
    },
  ],
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', '__allocationFixture', bundled.outputFiles[0].text)(
  compiled,
  compiled.exports,
  require,
  fixture,
)
const { CreatorAllocationPage, syncProfile, getAllocationLogPresentation, getLogColumns, useDictStore } =
  compiled.exports

beforeEach(() => {
  calls.length = 0
  messages.length = 0
  fixture.env = { VITE_APP_API_THIRDURL: 'https://profile.example.test/' }
  fixture.permissions = ['creator:allocation:save', 'creator:allocationOperationLog:list', 'creator:allocation:delete']
  fixture.roles = []
  fixture.row = { ...row }
  fixture.latestRows = [{ ...row }]
  fixture.tables.clear()
  fixture.refreshes = 0
  useDictStore.getState().push(
    'PLATFORM',
    [
      { value: 'DY', label: '抖音' },
      { value: 'TB', label: '淘宝' },
    ],
    true,
  )
  getProfile = async () => response({ data: { uid, nickname: '最新昵称' } })
  putRecord = async () => response(null)
  getLogs = async () => response({ list: [], total: 0 })
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

function deferred() {
  let resolve
  const promise = new Promise(done => {
    resolve = done
  })
  return { promise, resolve }
}

async function mount(t, component = CreatorAllocationPage, props) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  await act(async () => root.render(createElement(component, props)))
  return container
}

function button(container, label) {
  const element = [...container.querySelectorAll('button')].find(node => node.textContent === label)
  assert.ok(element, '应找到按钮：' + label)
  return element
}

test('按原始字符串 UID 请求资料，仅保存昵称与接口必填字段，不提交行关联或覆盖 UID', async () => {
  assert.equal(await syncProfile(row), true)
  assert.equal(calls[0].url, 'https://profile.example.test/api/douyin/web/get_user_info')
  assert.deepEqual(calls[0].config.params, { uid })
  assert.deepEqual(calls[1].config.params, { aweme_id: uid, performance_id: 'live', page: 1, page_size: 20 })
  assert.deepEqual(calls[2], {
    method: 'put',
    url: '/admin/creator/allocation/save/23',
    data: { aweme_name: '最新昵称', performance_id: 'live', business_id: '7', reason: '同步达人资料' },
  })
})

test('资料无变化不写入；错人、空昵称、非法 UID 或服务错误均不覆盖当前记录', async () => {
  getProfile = async () => response({ data: { uid, nickname: row.aweme_name } })
  assert.equal(await syncProfile(row), false)
  for (const [profile, message] of [
    [{ uid: '123', nickname: '其他达人' }, /UID.*不一致/],
    [{ uid, nickname: ' ' }, /未获取到达人昵称/],
    [{ uid: 9876543210987654321, nickname: '精度丢失' }, /UID 格式无效/],
  ]) {
    getProfile = async () => response({ data: profile })
    await assert.rejects(syncProfile(row), message)
  }
  getProfile = async () => ({ data: { code: 500, message: '资料服务失败' } })
  await assert.rejects(syncProfile(row), /资料服务失败/)
  assert.equal(calls.filter(call => call.method === 'put').length, 0)
  fixture.env = {}
  await assert.rejects(syncProfile(row), /未配置/)
  await assert.rejects(syncProfile({ ...row, aweme_id: 'invalid' }), /UID 无效/)
})

test('同步前重新读取分配记录，商务或渠道已变化、记录已删除时停止保存', async () => {
  for (const latestRows of [
    [],
    [{ ...row, business_id: 8 }],
    [{ ...row, performance_id: 'video' }],
    [{ ...row, aweme_id: '123' }],
  ]) {
    fixture.latestRows = latestRows
    await assert.rejects(syncProfile(row), /记录已变更/)
  }
  assert.equal(calls.filter(call => call.method === 'put').length, 0)
})

test('操作列直接展示分配、同步、日志、删除，分配弹窗锁定已有 UID', async t => {
  const container = await mount(t)
  const column = fixture.tables.get('达人分配').schema.tableColumns.find(column => column.type === 'operation')
  assert.equal(column.operationConfigure.type, 'tile')
  assert.deepEqual(
    column.operationConfigure.actions.map(action => action.text),
    ['分配', '同步', '日志', '删除'],
  )
  await act(async () => button(container, '分配').click())
  const dialog = document.querySelector('[role="dialog"]')
  assert.match(dialog.textContent, /重新分配达人：原昵称/)
  assert.equal(dialog.querySelector('#aweme_id').value, uid)
  assert.equal(dialog.querySelector('#aweme_id').disabled, true)
  assert.ok(dialog.querySelector('[data-slot="dialog-footer"]'))
})

test('平台从 PLATFORM 字典回显标签，切换后保存字典值，清空时提交 null', async t => {
  const container = await mount(t)
  await act(async () => button(container, '分配').click())
  const dialog = document.querySelector('[role="dialog"]')
  assert.match(dialog.querySelector('#platform').textContent, /抖音/)
  await act(async () => dialog.querySelector('#platform').click())
  const choice = [...document.querySelectorAll('[role="option"]')].find(option => option.textContent === '淘宝')
  assert.ok(choice)
  await act(async () => choice.click())
  assert.match(dialog.querySelector('#platform').textContent, /淘宝/)
  await act(async () => button(dialog, '保存').click())
  assert.equal(calls.find(call => call.method === 'put').data.platform, 'TB')

  await act(async () => button(container, '分配').click())
  const reopened = document.querySelector('[role="dialog"]')
  await act(async () => reopened.querySelector('#platform').click())
  const empty = [...document.querySelectorAll('[role="option"]')].find(option => option.textContent === '未设置')
  assert.ok(empty)
  await act(async () => empty.click())
  await act(async () => button(reopened, '保存').click())
  assert.equal(calls.filter(call => call.method === 'put').at(-1).data.platform, null)
})

test('平台变更日志显示字典标签并兼容旧快照未记录平台', () => {
  const presentation = getAllocationLogPresentation(
    {
      operation_type: 'UPDATE',
      changed_fields: ['platform'],
      before_data: { platform: 'DY' },
      after_data: { platform: 'TB' },
    },
    useDictStore.getState().dictionaries.PLATFORM,
  )
  assert.deepEqual(presentation.changes, [{ field: 'platform', label: '平台', before: '抖音', after: '淘宝' }])
  assert.equal(getAllocationLogPresentation({ before_data: {}, after_data: {} }).snapshotRows.length, 0)
})

test('非所属商务不能分配或同步，直接调用操作处理函数也不会发请求', async t => {
  fixture.row = { ...row, business_id: 8 }
  const container = await mount(t)
  assert.equal(button(container, '分配').disabled, true)
  assert.equal(button(container, '同步').disabled, true)
  const actions = fixture.tables.get('达人分配').schema.tableColumns.find(column => column.type === 'operation')
    .operationConfigure.actions
  await act(async () => {
    actions.find(action => action.name === 'assign').onClick({ row: fixture.row })
    actions.find(action => action.name === 'sync').onClick({ row: fixture.row })
  })
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(calls.length, 0)
})

test('超级管理员可分配其他商务的记录，缺少接口权限时不显示对应入口', async t => {
  fixture.row = { ...row, business_id: 8 }
  fixture.roles = ['SuperAdmin']
  const container = await mount(t)
  assert.equal(button(container, '分配').disabled, false)
  assert.equal(button(container, '同步').disabled, false)
  fixture.permissions = ['creator:allocation:log']
  const restricted = await mount(t)
  for (const label of ['分配', '同步', '日志'])
    assert.equal(
      [...restricted.querySelectorAll('button')].some(node => node.textContent === label),
      false,
    )
})

test('重复点击同步只请求一次，保存确认后才提示成功并刷新列表', async t => {
  const profileRequest = deferred()
  const saveRequest = deferred()
  getProfile = () => profileRequest.promise
  putRecord = () => saveRequest.promise
  const container = await mount(t)
  await act(async () => {
    button(container, '同步').click()
    button(container, '同步').click()
  })
  assert.equal(calls.length, 1)
  assert.equal(button(container, '同步').disabled, true)
  assert.equal(button(container, '分配').disabled, true)
  await act(async () => profileRequest.resolve(response({ data: { uid, nickname: '最新昵称' } })))
  assert.equal(calls.filter(call => call.method === 'put').length, 1)
  assert.equal(messages.length, 0)
  await act(async () => saveRequest.resolve(response(null)))
  assert.deepEqual(messages, [['达人昵称已同步', 'success']])
  assert.equal(fixture.refreshes, 1)
  assert.equal(button(container, '同步').disabled, false)
})

test('保存失败保留错误反馈，不报告同步成功，之后仍可重试', async t => {
  putRecord = async () => {
    throw { message: '保存失败' }
  }
  const container = await mount(t)
  await act(async () => button(container, '同步').click())
  assert.deepEqual(messages, [['保存失败', 'destructive']])
  assert.equal(fixture.refreshes, 0)
  assert.equal(button(container, '同步').disabled, false)
})

const log = {
  id: 1,
  operation_no: 'batch-1',
  allocation_id: 23,
  aweme_id: uid,
  operation_type: 'HANDOVER_TRANSFER',
  operation_source: 'MANUAL',
  operator_id: 7,
  operator_id_name: '操作员',
  from_business_id: 7,
  to_business_id: 8,
  from_business_id_name: '商务甲',
  to_business_id_name: '商务乙',
  from_performance_id: 'live',
  to_performance_id: 'video',
  from_performance_id_display: '直播 (live)',
  to_performance_id_display: '短视频 (video)',
}

test('日志抽屉展示达人摘要，按当前分配 ID 加载时间轴，加载更早记录后仍可刷新', async t => {
  fixture.row = { ...row, performance_id_text: '直播' }
  const entries = Array.from({ length: 21 }, (_, index) => ({
    ...log,
    id: 21 - index,
    operation_no: `batch-${21 - index}`,
    created_at: '2026-09-13 12:30:00',
  }))
  getLogs = async params =>
    response({
      list: entries.slice((params.page - 1) * params.page_size, params.page * params.page_size),
      total: entries.length,
    })
  const container = await mount(t)
  await act(async () => button(container, '日志').click())
  const dialog = document.querySelector('[role="dialog"]')
  const summary = dialog.querySelector('section[aria-label="达人信息"]')
  for (const value of ['原昵称', uid, '商务甲', '直播', 'leader']) assert.ok(summary.textContent.includes(value))
  const timeline = dialog.querySelector('ol[aria-label="达人分配变更时间轴"]')
  assert.ok(summary.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING)
  assert.equal(timeline.children.length, 20)
  assert.ok(timeline.firstElementChild.textContent.includes('batch-21'))
  assert.equal(timeline.querySelector('time').dateTime, '2026-09-13T12:30:00')
  await act(async () => {
    button(dialog, '加载更早记录').click()
    button(dialog, '加载更早记录').click()
  })
  assert.equal(timeline.children.length, 21)
  assert.ok(timeline.lastElementChild.textContent.includes('batch-1'))
  assert.deepEqual(
    calls.map(call => call.config.params),
    [1, 2].map(page => ({ allocation_id: 23, page, page_size: 20, order_by: 'id', order_by_direction: 'desc' })),
  )
  await act(async () => dialog.querySelector('[aria-label="刷新变更记录"]').click())
  assert.equal(dialog.querySelector('ol').children.length, 20)
  assert.equal(calls.at(-1).config.params.page, 1)
})

test('日志首屏失败可重试，加载历史失败保留已显示记录并重试原页，分页重叠不重复显示', async t => {
  let failure = true
  const entries = Array.from({ length: 20 }, (_, index) => ({ ...log, id: 21 - index }))
  getLogs = async params => {
    if (failure) throw new Error('日志服务暂时不可用')
    return response({ list: params.page === 1 ? entries : [entries.at(-1), log], total: 21 })
  }
  const container = await mount(t)
  await act(async () => button(container, '日志').click())
  const dialog = document.querySelector('[role="dialog"]')
  assert.match(dialog.querySelector('[role="alert"]').textContent, /日志服务暂时不可用/)
  assert.equal(dialog.querySelector('ol'), null)
  failure = false
  await act(async () => button(dialog, '重试').click())
  assert.equal(dialog.querySelector('ol').children.length, 20)
  failure = true
  await act(async () => button(dialog, '加载更早记录').click())
  assert.equal(dialog.querySelector('ol').children.length, 20)
  assert.ok(dialog.querySelector('[role="alert"]'))
  failure = false
  await act(async () => button(dialog, '重试').click())
  assert.equal(dialog.querySelector('ol').children.length, 21)
  assert.equal(dialog.querySelector('[role="alert"]'), null)
  assert.deepEqual(
    calls.map(call => call.config.params.page),
    [1, 1, 2, 2],
  )
})

test('关闭日志后打开另一达人，旧请求迟到不会覆盖新达人的空状态', async t => {
  const pending = deferred()
  getLogs = params =>
    params.allocation_id === 23 ? pending.promise : Promise.resolve(response({ list: [], total: 0 }))
  const container = await mount(t)
  await act(async () => button(container, '日志').click())
  assert.match(document.querySelector('[role="dialog"]').textContent, /正在加载变更记录/)
  fixture.row = { ...row, id: 24, aweme_name: '另一达人' }
  await act(async () => document.querySelector('[data-slot="sheet-close"]').click())
  await act(async () => button(container, '日志').click())
  await act(async () => pending.resolve(response({ list: [log], total: 1 })))
  const dialog = document.querySelector('[role="dialog"]')
  assert.match(dialog.querySelector('section[aria-label="达人信息"]').textContent, /另一达人/)
  assert.match(dialog.textContent, /暂无变更记录/)
  assert.equal(dialog.querySelector('ol'), null)
  assert.deepEqual(
    calls.map(call => call.config.params.allocation_id),
    [23, 24],
  )
})

test('日志显示中文操作、商务姓名和渠道名称，兼容 JSON 快照及历史字段别名', async t => {
  const entry = {
    ...log,
    reason: '调整负责人',
    remark: '已沟通',
    changed_fields: '["from_business_id","to_business_id","performance_id","aweme_id"]',
    before_data: JSON.stringify({ business_id: 7, performance_id: 'live', aweme_id: uid }),
    after_data: JSON.stringify({ business_id: 8, performance_id: 'video', aweme_id: '9876543210987654322' }),
  }
  const parsed = getAllocationLogPresentation(entry)
  assert.equal(parsed.operationLabel, '交接并转移')
  assert.equal(parsed.sourceLabel, '手动')
  assert.equal(parsed.operator, '操作员 (7)')
  assert.deepEqual(parsed.changes, [
    { field: 'business_id', label: '商务', before: '商务甲 (7)', after: '商务乙 (8)' },
    { field: 'performance_id', label: '渠道分类', before: '直播 (live)', after: '短视频 (video)' },
    { field: 'aweme_id', label: '抖音UID', before: uid, after: '9876543210987654322' },
  ])
  const container = await mount(t, 'div', { children: getLogColumns()[0].cellRender({ row: entry }) })
  for (const text of ['调整负责人', '已沟通', '商务甲 (7)', '商务乙 (8)', '变更前：', '变更后：'])
    assert.ok(container.textContent.includes(text))
})

test('旧日志缺少快照或包含无效 JSON 仍可显示变更，清空值不会回退到旧值', () => {
  const parsed = getAllocationLogPresentation({ ...log, changed_fields: 'invalid', before_data: '{', after_data: null })
  assert.equal(parsed.changes.length, 2)
  const cleared = getAllocationLogPresentation({
    ...log,
    changed_fields: ['leader_id'],
    before_data: { leader_id: '123' },
    after_data: { leader_id: null },
  })
  assert.deepEqual(cleared.changes, [{ field: 'leader_id', label: '团长ID', before: '123', after: '-' }])
})

test('新增日志保留前后对比，明细默认展开且两个折叠项可以独立开合', async t => {
  const created = {
    ...log,
    operation_type: 'CREATE',
    changed_fields: ['aweme_name', 'aweme_id', 'business_id'],
    before_data: {},
    after_data: { aweme_name: '新达人', aweme_id: uid, business_id: 8 },
  }
  const container = await mount(t, 'div', { children: getLogColumns()[0].cellRender({ row: created }) })
  for (const text of ['达人昵称', '新达人', uid, '商务乙 (8)']) assert.ok(container.textContent.includes(text))
  assert.equal(container.querySelectorAll('.lucide-arrow-right').length, 3)
  assert.equal(container.querySelector('table'), null)
  const changesTrigger = button(container, '变更明细')
  const trigger = button(container, '查看前后快照')
  assert.equal(changesTrigger.getAttribute('aria-expanded'), 'true')
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  await act(async () => trigger.click())
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  assert.equal(changesTrigger.getAttribute('aria-expanded'), 'true')
  assert.ok(container.querySelector('table[aria-label="操作前后快照"]'))
  await act(async () => changesTrigger.click())
  assert.equal(changesTrigger.getAttribute('aria-expanded'), 'false')
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  await act(async () => trigger.click())
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  await act(async () => changesTrigger.click())
  assert.equal(changesTrigger.getAttribute('aria-expanded'), 'true')
})

test('快照保留未变字段且尊重清空值，变更明细只展示发生变化的字段', () => {
  const parsed = getAllocationLogPresentation({
    ...log,
    operation_type: 'UPDATE',
    changed_fields: ['business_id', 'leader_id'],
    before_data: { aweme_name: '保持不变', aweme_id: uid, business_id: 7, leader_id: '123' },
    after_data: { aweme_name: '保持不变', aweme_id: uid, business_id: 8, leader_id: null },
  })
  assert.deepEqual(
    parsed.changes.map(change => change.field),
    ['business_id', 'leader_id'],
  )
  assert.deepEqual(
    parsed.snapshotRows.find(snapshot => snapshot.field === 'aweme_id'),
    { field: 'aweme_id', label: '抖音UID', before: uid, after: uid },
  )
  assert.deepEqual(
    parsed.snapshotRows.find(snapshot => snapshot.field === 'aweme_name'),
    { field: 'aweme_name', label: '达人昵称', before: '保持不变', after: '保持不变' },
  )
  assert.equal(parsed.snapshotRows.find(snapshot => snapshot.field === 'leader_id').after, '-')
})
