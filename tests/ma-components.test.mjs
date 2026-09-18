import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement, createRef, useState } from 'react'

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
const { Dialog: DialogPrimitive } = require('@base-ui/react/dialog')
const result = await build({
  stdin: {
    contents: ['ma-form', 'ma-search', 'ma-table', 'ma-pro-table', 'ma-dialog', 'ma-drawer']
      .map(name => `export * from './src/components/${name}'`)
      .join('\n'),
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const { MaForm, MaSearch, MaTable, MaProTable, MaDialog, MaDrawer } = compiled.exports

async function mount(t, component, props) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = async nextProps => {
    await act(async () => root.render(createElement(component, nextProps)))
  }
  t.after(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  await render(props)
  return { container, render }
}

async function click(element) {
  assert.ok(element, '应找到可点击的控件')
  await act(async () => element.click())
}

function button(container, text) {
  return [...container.querySelectorAll('button')].find(
    node => node.textContent === text || node.getAttribute('aria-label') === text,
  )
}

async function enterValue(input, value) {
  assert.ok(input, '应找到输入控件')
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
}

after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

test('MaForm 接收新的字段和禁用配置，旧的命令式配置不会在 props 切回后复活', async t => {
  const ref = createRef()
  const originalItems = [{ label: '原字段', prop: 'first' }]
  const view = await mount(t, MaForm, { ref, items: originalItems })
  await act(async () => ref.current.setItems([{ label: '命令式字段', prop: 'local' }]))
  assert.match(view.container.textContent, /命令式字段/)
  await view.render({ ref, items: [{ label: '新字段', prop: 'second' }], options: { disabled: true } })
  assert.match(view.container.textContent, /新字段/)
  assert.equal(view.container.querySelector('input').disabled, true)
  await view.render({ ref, items: originalItems })
  assert.match(view.container.textContent, /原字段/)
  assert.doesNotMatch(view.container.textContent, /命令式字段/)
})

test('MaForm 未传配置时 ref 修改可跨内部渲染保留', async t => {
  const ref = createRef()
  const view = await mount(t, MaForm, { ref })
  await act(async () => ref.current.setItems([{ label: '添加字段', prop: 'name' }]))
  await act(async () => ref.current.setValues({ name: '新值' }))
  assert.equal(view.container.querySelector('input').value, '新值')
})

test('MaForm 新的 loading 配置不被之前的命令式 false 锁死', async t => {
  const ref = createRef()
  const items = [{ prop: 'name' }]
  const view = await mount(t, MaForm, { ref, items, options: { loading: false } })
  await act(async () => ref.current.setLoadingState(false))
  await view.render({ ref, items, options: { loading: true } })
  assert.equal(view.container.querySelector('input').disabled, true)
})

test('MaForm Select 使用 Root 多选 API，保留选项值类型和事件详情', async t => {
  const ref = createRef()
  const events = []
  const view = await mount(t, MaForm, {
    ref,
    defaultValue: { tags: [] },
    items: [
      {
        prop: 'tags',
        label: '标签',
        render: 'Select',
        renderProps: {
          multiple: true,
          options: [
            { label: '第一项', value: 1 },
            { label: '第二项', value: 2 },
          ],
          onValueChange: (value, details) => events.push([value, typeof details.cancel]),
          triggerProps: { 'data-select-trigger': 'true' },
          popupProps: { 'data-select-popup': 'true' },
        },
      },
    ],
  })
  await click(view.container.querySelector('[data-select-trigger]'))
  assert.ok(document.querySelector('[data-select-popup]'))
  await click([...document.querySelectorAll('[role="option"]')].find(node => node.textContent.includes('第一项')))
  await click([...document.querySelectorAll('[role="option"]')].find(node => node.textContent.includes('第二项')))
  assert.deepEqual(ref.current.getValues().tags, [1, 2])
  assert.deepEqual(
    events.map(event => event[1]),
    ['function', 'function'],
  )
  assert.match(view.container.querySelector('[data-select-trigger]').textContent, /第一项/)
  assert.match(view.container.querySelector('[data-select-trigger]').textContent, /第二项/)
})

test('MaForm Select 和 Switch 的 cancel 阻止模型写入，全局 disabled 无法被局部 false 覆盖', async t => {
  const ref = createRef()
  const items = [
    {
      prop: 'status',
      render: 'Select',
      renderProps: { options: [{ label: '启用', value: true }], onValueChange: (_value, details) => details.cancel() },
    },
    {
      prop: 'active',
      render: 'Switch',
      renderProps: { disabled: false, onCheckedChange: (_value, details) => details.cancel() },
    },
  ]
  const view = await mount(t, MaForm, { ref, defaultValue: { active: false }, items })
  await click(view.container.querySelector('[role="switch"]'))
  assert.equal(ref.current.getValues().active, false)
  await click(view.container.querySelector('[role="combobox"]'))
  await click(document.querySelector('[role="option"]'))
  assert.equal(ref.current.getValues().status, undefined)
  await view.render({ ref, items, options: { disabled: true } })
  assert.equal(view.container.querySelector('[role="switch"]').getAttribute('aria-disabled'), 'true')
})

test('MaForm Switch 和 Radio 使用 Base UI 控件，并保留业务值', async t => {
  const ref = createRef()
  const view = await mount(t, MaForm, {
    ref,
    defaultValue: { active: false, status: 0 },
    items: [
      { prop: 'active', label: '开关', render: 'Switch' },
      {
        prop: 'status',
        label: '状态',
        render: 'Radio',
        renderProps: {
          options: [
            { label: '关', value: 0 },
            { label: '开', value: 1 },
          ],
        },
      },
    ],
  })
  assert.ok(view.container.querySelector('[data-slot="switch-thumb"]'))
  await click(view.container.querySelector('[role="switch"]'))
  await click(view.container.querySelectorAll('[role="radio"]')[1])
  assert.equal(ref.current.getValues().active, true)
  assert.equal(ref.current.getValues().status, 1)
})

test('MaForm InputNumber 使用 NumberField，步进、范围、事件和清空按数值契约处理', async t => {
  const ref = createRef()
  const events = []
  const view = await mount(t, MaForm, {
    ref,
    defaultValue: { count: 2 },
    items: [
      {
        prop: 'count',
        render: 'InputNumber',
        renderProps: {
          min: 0,
          max: 4,
          step: 2,
          onValueChange: (value, details) => events.push([value, details.reason]),
        },
      },
    ],
  })
  assert.ok(view.container.querySelector('[data-slot="number-field"]'))
  await click(button(view.container, '增加'))
  assert.equal(ref.current.getValues().count, 4)
  await click(button(view.container, '增加'))
  assert.equal(ref.current.getValues().count, 4)
  await enterValue(view.container.querySelector('[data-slot="number-field-input"]'), '')
  assert.equal(ref.current.getValues().count, undefined)
  assert.ok(events.some(event => event[1] === 'increment-press'))
})

test('MaForm DatePicker 使用 Calendar，TimePicker 使用分段 Select，值仍可序列化', async t => {
  const ref = createRef()
  const view = await mount(t, MaForm, {
    ref,
    defaultValue: { date: '2026-09-13', time: '09:30' },
    items: [
      {
        prop: 'date',
        label: '日期',
        render: 'DatePicker',
        renderProps: { calendarProps: { defaultMonth: new Date(2026, 8, 1) } },
      },
      { prop: 'time', label: '时间', render: 'TimePicker', renderProps: { minuteStep: 15 } },
    ],
  })
  assert.equal(view.container.querySelector('input[type="date"], input[type="time"]'), null)
  await click(button(view.container, '请选择日期'))
  const day = [...document.querySelectorAll('button[data-day]')].find(node => node.textContent === '14')
  await click(day)
  assert.equal(ref.current.getValues().date, '2026-09-14')
  await click(view.container.querySelector('[aria-label="分"]'))
  await click([...document.querySelectorAll('[role="option"]')].find(node => node.textContent === '45'))
  assert.equal(ref.current.getValues().time, '09:45')
})

test('MaForm 必选多选值为空数组时校验不通过', async t => {
  const ref = createRef()
  await mount(t, MaForm, {
    ref,
    defaultValue: { tags: [] },
    items: [
      { prop: 'tags', render: 'Select', renderProps: { multiple: true }, itemProps: { rules: { required: true } } },
    ],
  })
  let validation
  await act(async () => {
    validation = await ref.current.validate()
  })
  assert.equal(validation.valid, false)
  assert.deepEqual(Object.keys(validation.errors), ['tags'])
})

test('MaForm 日期 min/max 兼容旧配置并与 Calendar 禁用规则合并', async t => {
  const view = await mount(t, MaForm, {
    items: [
      {
        prop: 'date',
        render: 'DatePicker',
        renderProps: {
          min: '2026-09-10',
          max: '2026-09-20',
          calendarProps: { defaultMonth: new Date(2026, 8, 1), disabled: new Date(2026, 8, 15) },
        },
      },
    ],
  })
  await click(button(view.container, '请选择日期'))
  const days = [...document.querySelectorAll('button[data-day]')]
  for (const value of ['9', '15', '21']) assert.equal(days.find(day => day.textContent === value).disabled, true)
  assert.equal(days.find(day => day.textContent === '14').disabled, false)
})

test('MaSearch 展开时字段可见，动态字段与表单配置同步到底层', async t => {
  const ref = createRef()
  const items = Array.from({ length: 3 }, (_, index) => ({ label: `字段${index}`, prop: `field${index}` }))
  const options = { fold: true, foldRows: 1, cols: { xs: 1, sm: 1, md: 1, lg: 1, xl: 1 } }
  const view = await mount(t, MaSearch, { ref, items, options })
  assert.equal(view.container.querySelectorAll('[data-slot="field"].hidden').length, 2)
  await click(button(view.container, '展开'))
  assert.equal(view.container.querySelectorAll('[data-slot="field"].hidden').length, 0)
  assert.equal(ref.current.getFold(), false)
  await view.render({
    ref,
    items: [{ prop: 'replacement', label: '替换字段' }],
    options,
    formOptions: { disabled: true },
  })
  assert.equal(view.container.querySelectorAll('input').length, 1)
  assert.equal(view.container.querySelector('input').disabled, true)
})

test('MaTable 隐藏分页器或未配置分页时展示全部本地数据，显式分页按页切分', async t => {
  const rows = Array.from({ length: 25 }, (_, index) => ({ id: index + 1 }))
  const props = { columns: [{ prop: 'id', label: '编号' }], data: rows }
  const view = await mount(t, MaTable, { ...props, options: { showPagination: false } })
  assert.equal(view.container.querySelectorAll('tbody tr[data-row-id]').length, 25)
  await view.render(props)
  assert.equal(view.container.querySelectorAll('tbody tr[data-row-id]').length, 25)
  await view.render({ ...props, options: { pagination: { pageSize: 10 } } })
  assert.equal(view.container.querySelectorAll('tbody tr[data-row-id]').length, 10)
})

test('MaTable 分组、固定列和行级样式进入真实 DataGrid 渲染链', async t => {
  const view = await mount(t, MaTable, {
    columns: [
      {
        label: '资料',
        children: [
          { prop: 'id', label: '编号', fixed: 'left' },
          { prop: 'name', label: '名称' },
        ],
      },
    ],
    data: [{ id: 1, name: '测试' }],
    options: {
      rowClassName: (_row, index) => `row-${index}`,
      rowStyle: { color: 'red' },
      dataGridProps: { tableLayout: { headerSticky: true, columnsResizable: true } },
    },
  })
  assert.equal(view.container.querySelectorAll('thead tr').length, 2)
  assert.match(view.container.textContent, /资料/)
  assert.ok(view.container.querySelector('td[data-pinned="start"]'))
  assert.equal(view.container.querySelector('tbody tr').style.color, 'red')
  assert.ok(view.container.querySelector('tbody tr.row-0'))
})

test('MaTable 更换选择回调不重复上报，实际选择使用最新回调', async t => {
  const ref = createRef()
  const data = [{ id: 1 }]
  const columns = [{ type: 'selection' }, { prop: 'id', label: '编号' }]
  const first = []
  const second = []
  const view = await mount(t, MaTable, { ref, data, columns, onSelectionChange: rows => first.push(rows) })
  await view.render({ ref, data, columns, onSelectionChange: rows => second.push(rows) })
  assert.equal(first.length, 1)
  assert.equal(second.length, 0)
  await act(async () => ref.current.getTableInstance().toggleAllRowsSelected(true))
  assert.deepEqual(ref.current.getSelectionRows(), data)
  assert.equal(first.length, 1)
  assert.deepEqual(second, [data])
})

test('MaProTable 内联行键配置与父级选择状态不会形成重复渲染', async t => {
  const ref = createRef()
  const data = [{ id: 1, name: '字典项' }]
  const calls = []
  function SelectionPage() {
    const [selected, setSelected] = useState([])
    return createElement(
      'div',
      null,
      createElement('output', null, `已选择 ${selected.length} 项`),
      createElement(MaProTable, {
        ref,
        data,
        schema: { tableColumns: [{ type: 'selection' }, { prop: 'name' }] },
        options: { tableOptions: { rowKey: row => row.id } },
        onSelectionChange: rows => {
          calls.push(rows)
          if (calls.length > 8) throw new Error('选择未变化却重复通知，导致父页面循环渲染')
          setSelected(rows.map(row => row.id))
        },
      }),
    )
  }
  const view = await mount(t, SelectionPage, {})
  assert.deepEqual(calls, [[]])
  await act(async () => ref.current.getTableRef().getTableInstance().toggleAllRowsSelected(true))
  assert.deepEqual(calls, [[], data])
  assert.equal(view.container.querySelector('output').textContent, '已选择 1 项')
  await act(async () => ref.current.getTableRef().clearSelection())
  assert.deepEqual(calls, [[], data, []])
})

test('MaTable 相同选择不重复通知，选中行数据更新仍通知最新对象', async t => {
  const ref = createRef()
  const calls = []
  const data = [{ id: 1, name: '原始标签' }]
  const columns = [{ type: 'selection' }, { prop: 'name' }]
  const onSelectionChange = rows => {
    calls.push(rows)
  }
  const view = await mount(t, MaTable, { ref, data, columns, onSelectionChange, options: { rowKey: row => row.id } })
  await act(async () => ref.current.getTableInstance().toggleAllRowsSelected(true))
  await view.render({ ref, data: [...data], columns, onSelectionChange, options: { rowKey: row => row.id } })
  assert.deepEqual(calls, [[], data])
  const updated = [{ ...data[0], name: '更新后的标签' }]
  await view.render({ ref, data: updated, columns, onSelectionChange, options: { rowKey: row => row.id } })
  assert.deepEqual(calls, [[], data, updated])
  assert.equal(ref.current.getSelectionRows()[0], updated[0])
})

test('MaTable 暴露 TanStack 实例，列排序、列显示、列宽及新 props 生效', async t => {
  const ref = createRef()
  const columns = [
    { prop: 'id', label: '编号' },
    { prop: 'name', label: '名称' },
  ]
  const rows = [{ id: 1, name: '测试' }]
  const options = {
    dataGridProps: { tableLayout: { columnsResizable: true, columnsMovable: true, columnsVisibility: true } },
  }
  const view = await mount(t, MaTable, { ref, columns, data: rows, options })
  await act(async () => ref.current.getTableInstance().setColumnOrder(['name', 'id']))
  assert.equal(view.container.querySelector('tbody td').textContent, '测试')
  await act(async () => ref.current.getTableInstance().setColumnVisibility({ id: false }))
  assert.equal(view.container.querySelectorAll('tbody td:not([aria-hidden="true"])').length, 1)
  await act(async () => ref.current.getTableInstance().setColumnSizing({ name: 240 }))
  assert.equal(ref.current.getTableInstance().getColumn('name').getSize(), 240)
  await act(async () => ref.current.setColumns([{ prop: 'name', label: '临时' }]))
  await view.render({ ref, data: rows, options, columns: [{ prop: 'name', label: '新配置' }] })
  assert.match(view.container.textContent, /新配置/)
})

test('MaProTable 保留分页回调，动态页码与列配置可从 props 更新', async t => {
  const ref = createRef()
  const calls = []
  const rows = [{ id: 1 }]
  const onChange = (...args) => calls.push(args)
  const view = await mount(t, MaProTable, {
    ref,
    schema: { tableColumns: [{ prop: 'id', label: '编号' }] },
    data: rows,
    options: { tableOptions: { pagination: { currentPage: 1, pageSize: 10, total: 50, onChange } } },
  })
  await act(async () => ref.current.getTableRef().getTableInstance().setPageIndex(1))
  assert.deepEqual(calls, [[2, 10]])
  await view.render({
    ref,
    schema: { tableColumns: [{ prop: 'id', label: '新列名' }] },
    data: rows,
    options: { tableOptions: { pagination: { currentPage: 4, pageSize: 10, total: 50, onChange } } },
  })
  assert.equal(ref.current.getTableRef().getCurrentPage(), 4)
  assert.match(view.container.textContent, /新列名/)
})

test('MaProTable 新的请求配置优先，过期响应不能覆盖最新数据', async t => {
  const ref = createRef()
  let resolveOld
  const oldApi = () =>
    new Promise(resolve => {
      resolveOld = resolve
    })
  const calls = []
  const newApi = params => {
    calls.push(params)
    return { list: [{ id: '新数据' }], total: 1 }
  }
  const schema = { tableColumns: [{ prop: 'id', label: '编号' }] }
  const view = await mount(t, MaProTable, {
    ref,
    schema,
    options: { requestOptions: { api: oldApi, autoRequest: false, requestParams: { account: '旧账户' } } },
  })
  let oldRequest
  await act(async () => {
    oldRequest = ref.current.refresh()
  })
  await view.render({
    ref,
    schema,
    options: { requestOptions: { api: newApi, autoRequest: false, requestParams: { account: '新账户' } } },
  })
  await act(async () => ref.current.refresh())
  await act(async () => {
    resolveOld({ list: [{ id: '旧数据' }], total: 1 })
    await oldRequest
  })
  assert.equal(calls[0].account, '新账户')
  assert.match(view.container.textContent, /新数据/)
  assert.doesNotMatch(view.container.textContent, /旧数据/)
})

test('MaProTable 的 tableOptions.data 与分页回调可动态更新', async t => {
  const ref = createRef()
  const events = []
  const schema = { tableColumns: [{ prop: 'id', label: '编号' }] }
  const view = await mount(t, MaProTable, {
    ref,
    schema,
    options: { tableOptions: { data: [{ id: '旧行' }], pagination: { total: 50, currentPage: 3, pageSize: 10 } } },
  })
  await view.render({
    ref,
    schema,
    options: {
      tableOptions: {
        data: [{ id: '新行' }],
        pagination: {
          total: 80,
          currentPage: 3,
          pageSize: 10,
          onSizeChange: value => events.push(['size', value]),
          onCurrentChange: value => events.push(['page', value]),
          onChange: (...values) => events.push(['change', ...values]),
        },
      },
    },
  })
  assert.match(view.container.textContent, /新行/)
  assert.doesNotMatch(view.container.textContent, /旧行/)
  await act(async () => ref.current.getTableRef().getTableInstance().setPageSize(20))
  assert.deepEqual(events, [
    ['size', 20],
    ['page', 1],
    ['change', 1, 20],
  ])
  assert.equal(ref.current.getTableRef().getTableInstance().getPageCount(), 4)
})

test('MaDialog 尺寸参数可动态更新，覆盖同名 Popup 样式并保留其他样式', async t => {
  let popupHeight
  const props = {
    defaultOpen: true,
    title: '尺寸配置',
    height: 520,
    maxHeight: '80dvh',
    popupProps: {
      style: state => ({ height: 280, maxHeight: '95dvh', opacity: state.open ? 1 : 0 }),
      // Happy DOM 的 height 解析器不支持 dvh/svh，通过 Popup render 验证原始 CSS 值。
      render: props => {
        popupHeight = props.style.height
        return createElement('div', props)
      },
    },
  }
  const view = await mount(t, MaDialog, props)
  const popup = () => document.querySelector('[role="dialog"]')
  assert.equal(popup().style.height, '520px')
  assert.equal(popup().style.maxHeight, '80dvh')
  assert.equal(popup().style.opacity, '1')

  await view.render({ ...props, height: '60dvh', maxHeight: 640 })
  assert.equal(popupHeight, '60dvh')
  assert.equal(popup().style.maxHeight, '640px')

  await view.render({ ...props, height: undefined, maxHeight: undefined })
  assert.equal(popup().style.height, '280px')
  assert.equal(popup().style.maxHeight, '95dvh')
  assert.equal(popup().style.opacity, '1')
})

test('MaDialog 全屏时使用视口高度，退出后恢复配置且保留表单输入', async t => {
  const changes = []
  let popupHeight
  await mount(t, MaDialog, {
    defaultOpen: true,
    title: '长表单',
    height: 480,
    maxHeight: '70dvh',
    onFullscreenChange: value => changes.push(value),
    popupProps: {
      render: props => {
        popupHeight = props.style.height
        return createElement('div', props)
      },
    },
    children: createElement('input', { defaultValue: '原始内容', 'aria-label': '表单内容' }),
  })
  const popup = () => document.querySelector('[role="dialog"]')
  await enterValue(popup().querySelector('input'), '尚未保存的内容')
  await click(button(popup(), '全屏显示'))
  assert.equal(popupHeight, '100svh')
  assert.equal(popup().style.maxHeight, '100svh')
  assert.equal(popup().querySelector('input').value, '尚未保存的内容')

  await click(button(popup(), '退出全屏'))
  assert.equal(popup().style.height, '480px')
  assert.equal(popup().style.maxHeight, '70dvh')
  assert.equal(popup().querySelector('input').value, '尚未保存的内容')
  assert.deepEqual(changes, [true, false])
})

for (const [name, Component] of [
  ['MaDialog', MaDialog],
  ['MaDrawer', MaDrawer],
]) {
  test(`${name} 确认快捷键只作用于当前浮层，保留 Popup 事件回调`, async t => {
    const calls = []
    const keyEvents = []
    await mount(t, 'div', {
      children: [
        createElement(
          Component,
          {
            key: 'first',
            defaultOpen: true,
            modal: false,
            disablePointerDismissal: true,
            title: '第一个',
            onOk: () => {
              calls.push('first')
              return false
            },
          },
          createElement('input', { 'data-input': 'first' }),
        ),
        createElement(
          Component,
          {
            key: 'second',
            defaultOpen: true,
            modal: false,
            disablePointerDismissal: true,
            title: '第二个',
            onOk: () => {
              calls.push('second')
              return false
            },
            popupProps: { onKeyDown: event => keyEvents.push(event.key) },
          },
          createElement('input', { 'data-input': 'second' }),
        ),
      ],
    })
    await act(async () =>
      document
        .querySelector('[data-input="second"]')
        .dispatchEvent(
          new dom.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }),
        ),
    )
    assert.deepEqual(calls, ['second'])
    assert.deepEqual(keyEvents, ['Enter'])
  })

  test(`${name} 保留关闭原因和 cancel，命令式关闭遵守事件取消`, async t => {
    const actionsRef = createRef()
    const events = []
    let cancel = true
    await mount(t, Component, {
      defaultOpen: true,
      actionsRef,
      title: `${name}标题`,
      onOpenChange: (open, details) => {
        events.push([open, details.reason])
        if (cancel) details.cancel()
      },
    })
    await act(async () => actionsRef.current.close())
    assert.deepEqual(events, [[false, 'imperative-action']])
    assert.ok(document.querySelector('[role="dialog"]'))
    cancel = false
    await act(async () => actionsRef.current.close())
    assert.equal(document.querySelector('[role="dialog"]'), null)
  })

  test(`${name} 透传带类型 payload 的外部触发器及 Popup、Portal、Backdrop、Close 配置`, async t => {
    const handle = DialogPrimitive.createHandle()
    const target = document.createElement('section')
    document.body.append(target)
    t.after(() => target.remove())
    const view = await mount(t, 'div', {
      children: [
        createElement(DialogPrimitive.Trigger, { key: 'trigger', handle, payload: { title: '载荷内容' } }, '打开'),
        createElement(
          Component,
          {
            key: 'popup',
            handle,
            title: '标题',
            footer: false,
            portalProps: { container: target },
            popupProps: {
              'data-custom-popup': 'yes',
              className: state => (state.open ? 'popup-open' : 'popup-closed'),
            },
            backdropProps: { 'data-custom-backdrop': 'yes', className: state => (state.open ? 'backdrop-open' : '') },
            closeProps: { 'aria-label': '自定义关闭', children: '退出' },
          },
          ({ payload }) => payload?.title,
        ),
      ],
    })
    await click(button(view.container, '打开'))
    assert.match(target.textContent, /载荷内容/)
    assert.ok(target.querySelector('[data-custom-popup="yes"].popup-open'))
    assert.ok(target.querySelector('[data-custom-backdrop="yes"].backdrop-open'))
    assert.equal(button(target, '自定义关闭').textContent, '退出')
    await click(button(target, '自定义关闭'))
    assert.equal(target.querySelector('[role="dialog"]'), null)
  })
}

test('MaProTable 父级传入等价内联配置不会丢失在途响应', async t => {
  const ref = createRef()
  const pending = []
  const renderProps = () => ({
    ref,
    schema: { tableColumns: [{ prop: 'id', label: '编号' }] },
    options: {
      requestOptions: {
        api: params => new Promise(resolve => pending.push({ params, resolve })),
        requestParams: { status: 1 },
      },
    },
  })
  const view = await mount(t, MaProTable, renderProps())
  await act(async () => ref.current.setProTableOptions({ selection: { crossPage: false } }))
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })
  await view.render(renderProps())
  assert.equal(pending.length, 1)
  await act(async () => pending[0].resolve({ list: [{ id: '正常数据' }], total: 1 }))
  assert.match(view.container.textContent, /正常数据/)
  assert.equal(ref.current.getElTableStates().loading, false)
})

test('MaProTable 参数与显式数据源键变化自动加载，只接受最新响应', async t => {
  const ref = createRef()
  const pending = []
  const props = (account, requestKey = 'source-1') => ({
    ref,
    schema: { tableColumns: [{ prop: 'id', label: '编号' }] },
    options: {
      requestOptions: {
        requestKey,
        requestParams: { account },
        api: params => new Promise(resolve => pending.push({ params, resolve })),
      },
    },
  })
  const view = await mount(t, MaProTable, props('A'))
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })
  await view.render(props('B'))
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })
  assert.equal(pending.length, 2)
  assert.equal(pending[1].params.account, 'B')
  await act(async () => pending[1].resolve({ list: [{ id: 'B数据' }], total: 1 }))
  await act(async () => pending[0].resolve({ list: [{ id: 'A旧数据' }], total: 1 }))
  assert.match(view.container.textContent, /B数据/)
  assert.doesNotMatch(view.container.textContent, /A旧数据/)
  await view.render(props('B', 'source-2'))
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })
  assert.equal(pending.length, 3)
  await act(async () => pending[2].resolve({ list: [], total: 0 }))
})

test('MaProTable 列表和导出共享默认筛选、已提交筛选及归一化，导出去掉自定义分页', async t => {
  const ref = createRef()
  const calls = []
  const view = await mount(t, MaProTable, {
    ref,
    options: {
      searchOptions: { defaultValue: { status: '1', keyword: ' 名称 ' } },
      onSearchSubmit: form => ({ ...form, status: Number(form.status) }),
      onSearchReset: () => ({ status: 0 }),
      requestOptions: {
        autoRequest: false,
        api: params => {
          calls.push(params)
          return { list: [], total: 0 }
        },
        requestParams: { tenant: '固定', cursor: 9, limit: 3 },
        requestPage: { pageName: 'cursor', sizeName: 'limit', size: 20 },
        paramsTransform: params => ({
          ...params,
          ...(typeof params.keyword === 'string' ? { keyword: params.keyword.trim() } : {}),
        }),
      },
    },
    schema: { searchItems: [{ prop: 'status' }, { prop: 'keyword' }] },
  })
  await act(async () => ref.current.refresh())
  assert.deepEqual(ref.current.getRequestParams(), { tenant: '固定', status: '1', keyword: '名称' })
  assert.equal(calls[0].cursor, 1)
  assert.equal(calls[0].limit, 20)
  await click(button(view.container, '搜索'))
  assert.equal(ref.current.getRequestParams().status, 1)
  await click(button(view.container, '重置'))
  assert.deepEqual(ref.current.getRequestParams(), { tenant: '固定', status: 0 })
})
