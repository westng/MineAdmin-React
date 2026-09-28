import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { Activity, act, createElement, createRef, useState } from 'react'

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
const { Dialog: DialogPrimitive } = require('@base-ui/react/dialog')
const result = await build({
  stdin: {
    contents: [
      ...[
        'ma-form',
        'ma-search',
        'ma-table',
        'ma-pro-table',
        'ma-dialog',
        'ma-drawer',
        'ma-remote-select',
        'ma-dict-select',
      ].map(name => `export * from './src/components/${name}'`),
      "import { createAppRuntime } from './src/app/runtime/create-runtime'; export { RuntimeContext } from './src/provider/runtime/context'; export const testRuntime = createAppRuntime({ storage: window.localStorage }); export const useDictStore = testRuntime.dictionaries.store;",
    ].join('\n'),
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
const { MaForm, MaSearch, MaTable, MaProTable, MaDialog, MaDrawer, MaRemoteSelect, MaDictSelect, useDictStore } =
  compiled.exports

async function mount(t, component, props) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = async nextProps => {
    await act(async () =>
      root.render(
        createElement(
          compiled.exports.RuntimeContext.Provider,
          { value: compiled.exports.testRuntime },
          createElement(
            compiled.exports.MaDictionaryContext.Provider,
            {
              value: {
                subscribe: useDictStore.subscribe,
                getSnapshot: () => useDictStore.getState().dictionaries,
                subscribeLocale: compiled.exports.testRuntime.i18n.store.subscribe,
                getLocaleSnapshot: () => String(compiled.exports.testRuntime.i18n.store.getState().revision),
                translate: (key, fallback) => compiled.exports.testRuntime.i18n.store.getState().t(key, fallback),
              },
            },
            createElement(component, nextProps),
          ),
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

test('MaForm 渲染字段 Label，并保留控件无障碍名称和配置同步', async t => {
  const ref = createRef()
  const originalItems = [{ label: '原字段', prop: 'first' }]
  const view = await mount(t, MaForm, { ref, items: originalItems })
  assert.equal(view.container.querySelector('[data-slot="field-label"]').textContent, '原字段')
  assert.equal(view.container.querySelector('input').getAttribute('aria-label'), '原字段')
  await act(async () => ref.current.setItems([{ label: '命令式字段', prop: 'local' }]))
  assert.equal(view.container.querySelector('[data-slot="field-label"]').textContent, '命令式字段')
  assert.equal(view.container.querySelector('input').getAttribute('aria-label'), '命令式字段')
  await view.render({ ref, items: [{ label: '新字段', prop: 'second' }], options: { disabled: true } })
  assert.equal(view.container.querySelector('[data-slot="field-label"]').textContent, '新字段')
  assert.equal(view.container.querySelector('input').getAttribute('aria-label'), '新字段')
  assert.equal(view.container.querySelector('input').disabled, true)
  await view.render({ ref, items: originalItems })
  assert.equal(view.container.querySelector('[data-slot="field-label"]').textContent, '原字段')
  assert.equal(view.container.querySelector('input').getAttribute('aria-label'), '原字段')
})

test('MaForm 未传配置时 ref 修改可跨内部渲染保留', async t => {
  const ref = createRef()
  const view = await mount(t, MaForm, { ref })
  await act(async () => ref.current.setItems([{ label: '添加字段', prop: 'name' }]))
  await act(async () => ref.current.setValues({ name: '新值' }))
  assert.equal(view.container.querySelector('input').value, '新值')
})

test('MaForm 更新数组成员保留数组及未修改成员', async t => {
  const ref = createRef()
  const view = await mount(t, MaForm, {
    ref,
    defaultValue: { lines: [{ name: 'before' }, { name: 'keep' }] },
    items: [{ prop: 'lines.0.name', render: 'Input' }],
  })
  await enterValue(view.container.querySelector('input'), 'after')
  assert.deepEqual(ref.current.getValues().lines, [{ name: 'after' }, { name: 'keep' }])
})

test('MaForm 丢弃旧值的异步校验结果', async t => {
  const ref = createRef()
  let release, previous
  const view = await mount(t, MaForm, {
    ref,
    defaultValue: { name: 'old' },
    items: [
      {
        prop: 'name',
        itemProps: {
          rules: {
            validator: value =>
              value === 'old'
                ? new Promise(resolve => {
                    release = resolve
                  })
                : undefined,
          },
        },
      },
    ],
  })
  await act(async () => {
    previous = ref.current.validateField('name')
  })
  await act(async () => ref.current.setValues({ name: 'new' }))
  await act(async () => assert.equal(await ref.current.validateField('name'), true))
  await act(async () => {
    release('旧值错误')
    await previous
  })
  assert.equal(view.container.textContent.includes('旧值错误'), false)
})

test('MaForm 在校验和提交阶段均阻止重复提交，失败后允许重试', async t => {
  let submitted = 0,
    release
  const gate = new Promise(resolve => {
    release = resolve
  })
  const view = await mount(t, MaForm, {
    items: [{ prop: 'name' }],
    onSubmit: async () => {
      submitted++
      await gate
    },
  })
  const submit = () =>
    view.container.querySelector('form').dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true }))
  await act(async () => {
    submit()
    submit()
  })
  assert.equal(submitted, 1)
  assert.equal(view.container.querySelector('form').getAttribute('aria-busy'), 'true')
  await act(async () => release())
  await view.render({
    items: [],
    onSubmit: async () => {
      throw new Error('保存失败')
    },
  })
  await act(async () => submit())
  assert.match(view.container.querySelector('[role="alert"]').textContent, /保存失败/)
  await view.render({
    items: [],
    onSubmit: () => {
      submitted++
    },
  })
  await act(async () => submit())
  assert.equal(submitted, 2)
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
          controls: true,
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

test('MaForm 内置控件默认支持清除', async t => {
  const ref = createRef()
  const view = await mount(t, MaForm, {
    ref,
    defaultValue: {
      name: '名称',
      description: '描述',
      count: 2,
      status: 'ready',
      active: true,
      enabled: true,
      mode: 'a',
      date: '2026-09-13',
      time: '09:30',
    },
    items: [
      { prop: 'name', render: 'Input' },
      { prop: 'description', render: 'Textarea' },
      { prop: 'count', render: 'InputNumber' },
      { prop: 'status', render: 'Select', renderProps: { options: [{ label: '就绪', value: 'ready' }] } },
      { prop: 'active', render: 'Checkbox' },
      { prop: 'enabled', render: 'Switch' },
      { prop: 'mode', render: 'Radio', renderProps: { options: [{ label: 'A', value: 'a' }] } },
      { prop: 'date', render: 'DatePicker' },
      { prop: 'time', render: 'TimePicker' },
    ],
  })
  const clearButtons = [...view.container.querySelectorAll('[aria-label="清除"]')]
  assert.equal(clearButtons.length, 9)
  for (const clearButton of clearButtons) await click(clearButton)
  assert.deepEqual(ref.current.getValues(), {
    name: '',
    description: '',
    count: undefined,
    status: null,
    active: false,
    enabled: false,
    mode: undefined,
    date: undefined,
    time: undefined,
  })
})

test('MaForm 日期清除遵守只读和禁用状态，并使用触发器外的普通按钮', async t => {
  const ref = createRef()
  const defaultValue = { date: '2026-09-27' }
  const props = renderProps => ({ ref, defaultValue, items: [{ prop: 'date', render: 'DatePicker', renderProps }] })
  const view = await mount(t, MaForm, props({ readOnly: true }))
  for (const state of [
    { renderProps: { readOnly: true } },
    { renderProps: { disabled: true } },
    { renderProps: { triggerProps: { disabled: true } } },
    { renderProps: { clearable: false } },
    { renderProps: {}, options: { disabled: true } },
  ]) {
    await view.render({ ...props(state.renderProps), options: state.options ?? {} })
    assert.equal(view.container.querySelector('[aria-label="清除"]'), null)
    assert.deepEqual(ref.current.getValues(), defaultValue)
  }
  const changes = []
  await view.render(props({ onValueChange: value => changes.push(value) }))
  const clear = view.container.querySelector('[aria-label="清除"]')
  assert.equal(clear.tagName, 'BUTTON')
  assert.equal(clear.type, 'button')
  assert.equal(clear.parentElement.closest('button'), null)
  await click(clear)
  assert.equal(ref.current.getValues().date, undefined)
  assert.deepEqual(changes, [undefined])
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

test('MaSearch 将字段标签作为默认 placeholder，不渲染输入框前缀', async t => {
  const view = await mount(t, MaSearch, {
    items: [{ label: '昵称', prop: 'nickname', render: 'Input' }],
    options: { labelPlacement: 'inside' },
  })
  const input = view.container.querySelector('input')
  assert.equal(input.getAttribute('placeholder'), '昵称')
  assert.equal(input.getAttribute('aria-label'), '昵称')
  assert.equal(view.container.querySelector('[data-slot="input-group-addon"]'), null)
  assert.doesNotMatch(view.container.textContent, /昵称/)
})

test('MaSearch 保留业务显式 placeholder', async t => {
  const view = await mount(t, MaSearch, {
    items: [{ label: '昵称', prop: 'nickname', render: 'Input', renderProps: { placeholder: '搜索昵称' } }],
  })
  assert.equal(view.container.querySelector('input').getAttribute('placeholder'), '搜索昵称')
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

test('MaTable 将标签放在搜索区和工具栏之间', async t => {
  const view = await mount(t, MaTable, {
    columns: [{ prop: 'id', label: '编号' }],
    data: [{ id: 1 }],
    headerContent: createElement('div', { 'data-testid': 'search-content' }, '搜索区'),
    tabs: {
      value: 'shop',
      items: [
        { value: 'shop', label: '店铺' },
        { value: 'jzt', label: '京准通' },
      ],
    },
    toolbarLeft: createElement('button', { type: 'button' }, '新增授权'),
    options: { showPagination: false },
  })
  const search = view.container.querySelector('[data-testid="search-content"]')
  const tab = view.container.querySelector('[role="tab"]')
  const toolbar = view.container.querySelector('[role="toolbar"]')
  assert.ok(search)
  assert.ok(tab)
  assert.ok(toolbar)
  assert.ok(search.compareDocumentPosition(tab) & Node.DOCUMENT_POSITION_FOLLOWING)
  assert.ok(tab.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING)
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

test('MaProTable 操作列默认按钮与更多按钮保持相同高度', async t => {
  const view = await mount(t, MaProTable, {
    schema: {
      tableColumns: [
        {
          type: 'operation',
          label: '操作',
          operationConfigure: {
            actions: [
              { name: 'children', text: '子部门' },
              { name: 'leader', text: '设置负责人' },
              { name: 'delete', text: '删除', variant: 'destructive' },
            ],
          },
        },
      ],
    },
    data: [{ id: 1 }],
  })
  const operationButtons = [...view.container.querySelectorAll('tbody button')]
  assert.equal(operationButtons.length, 3)
  assert.ok(operationButtons.slice(0, 2).every(button => button.className.includes('h-7')))
  assert.ok(operationButtons[2].className.includes('size-7'))
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
  const fullscreenButton = button(popup(), '全屏显示')
  assert.match(fullscreenButton.className, /absolute/)
  assert.match(fullscreenButton.className, /top-2/)
  assert.match(fullscreenButton.className, /right-12/)
  assert.match(popup().querySelector('[data-slot="dialog-header"]').className, /relative/)
  await click(fullscreenButton)
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

test('MaRemoteSelect 默认 URL 请求支持固定参数、分页和标准选项响应', async t => {
  const calls = []
  const view = await mount(t, MaRemoteSelect, {
    url: '/admin/advertiser/options',
    params: { platform: 'QC' },
    request: async config => {
      calls.push(config)
      return { data: { code: 200, data: { items: [{ id: 7, name: '广告主 A' }], total: 1 } } }
    },
  })
  await click(view.container.querySelector('button'))
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/admin/advertiser/options')
  assert.deepEqual(calls[0].params, { platform: 'QC', page: 1, page_size: 20 })
  assert.match(document.body.textContent, /广告主 A/)
})

test('MaRemoteSelect 初始值自动请求回显选项', async t => {
  const calls = []
  const view = await mount(t, MaRemoteSelect, {
    url: '/admin/advertiser/options',
    value: 7,
    request: async config => {
      calls.push(config)
      return { data: { code: 200, data: { items: [{ id: 7, name: '已选广告主' }], total: 1 } } }
    },
  })
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })
  assert.equal(calls[0].params.ids, 7)
  assert.match(view.container.textContent, /已选广告主/)
})

async function settleRemoteSelect() {
  for (let step = 0; step < 3; step++) {
    await act(async () => new Promise(resolve => setTimeout(resolve, 10)))
  }
}

test('MaRemoteSelect 空或部分回显不会循环请求，选择变化后可重新回显', async t => {
  for (const example of [
    { value: 404, multiple: false, items: [] },
    { value: [7, 404], multiple: true, items: [{ id: 7, name: '有效选项' }] },
  ]) {
    await t.test(example.multiple ? '部分命中' : '不存在的选项', async t => {
      const calls = []
      const props = {
        url: '/fixture/options',
        value: example.value,
        multiple: example.multiple,
        request: async config => {
          calls.push(config)
          return { data: { code: 200, data: example.items } }
        },
      }
      const view = await mount(t, MaRemoteSelect, props)
      await settleRemoteSelect()
      await view.render({ ...props })
      await settleRemoteSelect()
      assert.equal(calls.length, 1)
      await view.render({ ...props, value: example.multiple ? [] : null })
      await settleRemoteSelect()
      await view.render(props)
      await settleRemoteSelect()
      assert.equal(calls.length, 2)
    })
  }
})

test('MaRemoteSelect 回显失败只在明确重试时再次请求原回显参数', async t => {
  let echoes = 0
  const calls = []
  const view = await mount(t, MaRemoteSelect, {
    url: '/fixture/options',
    value: 7,
    request: async config => {
      calls.push(config)
      if (config.params.ids !== undefined) {
        echoes++
        if (echoes === 1) throw new Error('回显暂时失败')
        return { data: { code: 200, data: [{ id: 7, name: '已恢复' }] } }
      }
      return { data: { code: 200, data: [] } }
    },
  })
  await settleRemoteSelect()
  assert.equal(echoes, 1)
  await click(view.container.querySelector('button'))
  await settleRemoteSelect()
  assert.match(document.body.textContent, /回显暂时失败/)
  await click(button(document.body, '重试'))
  await settleRemoteSelect()
  assert.equal(echoes, 2)
  assert.equal(calls.at(-1).params.ids, 7)
  assert.equal(calls.at(-1).params.page, undefined)
  assert.match(view.container.textContent, /已恢复/)
})

test('MaRemoteSelect 来源、参数、请求体、客户端和解析方式变化时重新回显', async t => {
  const calls = []
  const response = name => ({ data: { code: 200, data: [{ id: 7, name, alternate: '另一字段' }] } })
  const request = async config => {
    calls.push(config)
    return response(`${config.url}:${config.params.scope}:${config.data.scope}:${config.method}`)
  }
  let props = { url: '/a', value: 7, params: { scope: 'A' }, data: { scope: 'A' }, request }
  const view = await mount(t, MaRemoteSelect, props)
  await settleRemoteSelect()
  let previous = '/a:A:A:get'
  assert.ok(view.container.textContent.includes(previous))
  for (const [changes, expected] of [
    [{ url: '/b' }, '/b:A:A:get'],
    [{ params: { scope: 'B' } }, '/b:B:A:get'],
    [{ data: { scope: 'B' } }, '/b:B:B:get'],
    [{ method: 'post' }, '/b:B:B:post'],
    [
      {
        request: async config => {
          calls.push(config)
          return response('新客户端')
        },
      },
      '新客户端',
    ],
    [{ responseMap: () => ({ items: [{ id: 7, name: '新映射', alternate: '另一字段' }] }) }, '新映射'],
    [{ fieldNames: { value: 'id', label: 'alternate' } }, '另一字段'],
  ]) {
    const count = calls.length
    props = { ...props, ...changes }
    await view.render(props)
    assert.equal(view.container.textContent.includes(previous), false)
    await settleRemoteSelect()
    assert.ok(view.container.textContent.includes(expected))
    assert.equal(calls.length, count + 1)
    previous = expected
  }
  const count = calls.length
  await view.render({ ...props, params: { ...props.params }, data: { ...props.data } })
  await settleRemoteSelect()
  assert.equal(calls.length, count)
  await view.render({ ...props, echo: { url: '/echo', valueParam: 'selected' } })
  await settleRemoteSelect()
  assert.equal(calls.at(-1).url, '/echo')
  assert.equal(calls.at(-1).params.selected, 7)
})

test('MaRemoteSelect 来源或已选值变化会取消旧回显并忽略晚到响应', async t => {
  for (const next of [
    { url: '/b', value: 7 },
    { url: '/a', value: 8 },
  ]) {
    await t.test(next.url === '/b' ? '来源切换' : '选中值切换', async t => {
      const calls = []
      const props = {
        url: '/a',
        value: 7,
        request: config => new Promise(resolve => calls.push({ config, resolve })),
      }
      const view = await mount(t, MaRemoteSelect, props)
      await settleRemoteSelect()
      const old = calls[0]
      await view.render({ ...props, ...next })
      await settleRemoteSelect()
      assert.equal(old.config.signal.aborted, true)
      assert.equal(calls.length, 2)
      await act(async () => calls[1].resolve({ data: { code: 200, data: [{ id: next.value, name: '新选项' }] } }))
      await settleRemoteSelect()
      await act(async () => old.resolve({ data: { code: 200, data: [{ id: 7, name: '旧选项' }] } }))
      await settleRemoteSelect()
      assert.match(view.container.textContent, /新选项/)
      assert.equal(view.container.textContent.includes('旧选项'), false)
    })
  }
})

test('MaRemoteSelect 列表与回显独立加载，保留已选标签及列表分页', async t => {
  const calls = []
  const view = await mount(t, MaRemoteSelect, {
    url: '/fixture/options',
    value: 7,
    request: config => new Promise(resolve => calls.push({ config, resolve })),
  })
  await settleRemoteSelect()
  const echo = calls[0]
  await click(view.container.querySelector('button'))
  await settleRemoteSelect()
  const list = calls.find(call => call.config.params.page === 1)
  assert.ok(list)
  assert.equal(echo.config.signal.aborted, false)
  await act(async () => echo.resolve({ data: { code: 200, data: [{ id: 7, name: '保留标签' }] } }))
  await act(async () =>
    list.resolve({ data: { code: 200, data: { items: [{ id: 8, name: '列表项' }], hasMore: true } } }),
  )
  await settleRemoteSelect()
  assert.match(view.container.textContent, /保留标签/)
  const listbox = document.querySelector('[role="listbox"]')
  assert.ok(listbox)
  await act(async () => listbox.dispatchEvent(new Event('scroll', { bubbles: true })))
  await settleRemoteSelect()
  const next = calls.find(call => call.config.params.page === 2)
  assert.ok(next, '回显不能覆盖列表的下一页状态')
  await act(async () => next.resolve({ data: { code: 200, data: { items: [], hasMore: false } } }))
})

test('MaRemoteSelect 关闭下拉后的列表响应保留最新选中值的标签', async t => {
  const calls = []
  const props = {
    url: '/fixture/options',
    value: 7,
    request: config => new Promise(resolve => calls.push({ config, resolve })),
  }
  const view = await mount(t, MaRemoteSelect, props)
  await settleRemoteSelect()
  await click(view.container.querySelector('button'))
  await settleRemoteSelect()
  const list = calls.find(call => call.config.params.page === 1)
  assert.ok(list)
  await act(async () => calls[0].resolve({ data: { code: 200, data: [{ id: 7, name: '初始标签' }] } }))
  await settleRemoteSelect()
  await click(view.container.querySelector('button'))
  assert.equal(view.container.querySelector('button').getAttribute('aria-expanded'), 'false')
  await view.render({ ...props, value: 8 })
  await settleRemoteSelect()
  const next = calls.find(call => call.config.params.ids === 8)
  assert.ok(next)
  await act(async () => next.resolve({ data: { code: 200, data: [{ id: 8, name: '最新标签' }] } }))
  await settleRemoteSelect()
  await act(async () => list.resolve({ data: { code: 200, data: { items: [], hasMore: false } } }))
  await settleRemoteSelect()
  assert.match(view.container.textContent, /最新标签/)
})

test('MaRemoteSelect 可以作为 MaForm 自定义组件并回写表单值', async t => {
  const ref = createRef()
  const view = await mount(t, MaForm, {
    ref,
    defaultValue: { advertiser_id: null },
    items: [
      {
        prop: 'advertiser_id',
        label: '广告主',
        component: MaRemoteSelect,
        renderProps: {
          url: '/admin/advertiser/options',
          request: async () => ({ data: { code: 200, data: { items: [{ id: 7, name: '表单广告主' }] } } }),
        },
      },
    ],
  })
  await click(view.container.querySelector('button'))
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })
  await click([...document.querySelectorAll('[role="option"]')].find(node => node.textContent.includes('表单广告主')))
  assert.equal(ref.current.getValues().advertiser_id, 7)
  await click(view.container.querySelector('[aria-label="清除"]'))
  assert.equal(ref.current.getValues().advertiser_id, null)
})

test('MaDictSelect 从字典读取原始值并默认支持清除', async t => {
  const dictName = 'test-ma-dict-select'
  useDictStore.getState().push(
    dictName,
    [
      { label: '启用', value: 1 },
      { label: '禁用', value: 2 },
    ],
    true,
  )
  const changes = []
  function DictionaryFixture() {
    const [value, setValue] = useState(null)
    return createElement(MaDictSelect, {
      dictName,
      value,
      onChange: nextValue => {
        changes.push(nextValue)
        setValue(nextValue)
      },
    })
  }
  const view = await mount(t, DictionaryFixture, {})
  await click(view.container.querySelector('[data-slot="select-trigger"]'))
  await click([...document.querySelectorAll('[role="option"]')].find(node => node.textContent.includes('启用')))
  assert.deepEqual(changes, [1])
  assert.match(view.container.textContent, /启用/)
  await click(view.container.querySelector('[aria-label="清除"]'))
  assert.deepEqual(changes, [1, null])
  await act(async () => useDictStore.getState().remove(dictName))
})

const { useMaFormDialog, useMaConfirm } = compiled.exports

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function formDialogFixture(options, receive) {
  return function Fixture() {
    const editor = useMaFormDialog(options)
    receive(editor)
    return createElement(
      MaDialog,
      { ...editor.dialogProps, title: '编辑记录', okText: '保存记录' },
      createElement(MaForm, {
        ...editor.formProps,
        key: editor.formKey,
        items: [{ prop: 'name', label: '名称', itemProps: { rules: { required: true, message: '请填写名称' } } }],
      }),
    )
  }
}

test('表单弹窗统一校验、原生提交及按钮提交；失败保留输入并阻止重复保存和关闭', async t => {
  let editor
  let request
  const writes = []
  const errors = []
  const completed = []
  await mount(
    t,
    formDialogFixture(
      {
        defaultValues: () => ({ name: '' }),
        onSubmit: values => {
          writes.push(values.name)
          request = deferred()
          return request.promise
        },
        onSuccess: values => completed.push(values.name),
        onError: error => errors.push(error.message),
      },
      value => {
        editor = value
      },
    ),
  )
  await act(async () => editor.open(undefined))
  await click(button(document, '保存记录'))
  assert.equal(writes.length, 0)
  assert.match(document.body.textContent, /请填写名称/)
  await enterValue(document.querySelector('input'), '保留我的输入')
  await act(async () => {
    button(document, '保存记录').click()
    button(document, '保存记录').click()
  })
  assert.deepEqual(writes, ['保留我的输入'])
  assert.equal(button(document, '保存记录').disabled, true)
  await act(async () => {
    editor.close()
    editor.open(undefined)
    document.querySelector('form').dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true }))
  })
  assert.equal(writes.length, 1)
  assert.equal(editor.dialogProps.open, true)
  await act(async () => request.reject(new Error('服务器拒绝保存')))
  assert.deepEqual(errors, ['服务器拒绝保存'])
  assert.equal(document.querySelector('input').value, '保留我的输入')
  assert.equal(editor.dialogProps.open, true)
  await act(async () => {
    document.querySelector('form').dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true }))
  })
  assert.equal(writes.length, 2)
  await act(async () => request.resolve())
  assert.equal(editor.dialogProps.open, false)
  assert.deepEqual(completed, ['保留我的输入'])
  await act(async () => editor.open(undefined))
  assert.equal(document.querySelector('input').value, '')
})

test('表单弹窗隔离异步回填，加载时可取消，失败和无权限不能提交', async t => {
  let editor
  let allowed = true
  const loads = new Map()
  const errors = []
  const writes = []
  const view = await mount(
    t,
    formDialogFixture(
      {
        defaultValues: () => ({ name: '' }),
        loadValues: (id, signal) => {
          const pending = deferred()
          loads.set(id, { ...pending, signal })
          return pending.promise
        },
        canSubmit: () => allowed,
        onSubmit: values => {
          writes.push(values.name)
        },
        onError: error => errors.push(error.message),
      },
      value => {
        editor = value
      },
    ),
  )
  await act(async () => editor.open('A'))
  assert.equal(button(document, '保存记录').disabled, true)
  assert.equal(button(document, '取消').disabled, false)
  await click(button(document, '取消'))
  assert.equal(loads.get('A').signal.aborted, true)
  await act(async () => editor.open('B'))
  await act(async () => loads.get('B').resolve({ name: 'B' }))
  await act(async () => loads.get('A').resolve({ name: 'A' }))
  assert.equal(document.querySelector('input').value, 'B')
  await enterValue(document.querySelector('input'), '临时修改')
  await act(async () => editor.formProps.ref.current.resetFields())
  assert.equal(document.querySelector('input').value, 'B')
  allowed = false
  await view.render({})
  assert.equal(button(document, '保存记录'), undefined)
  await act(async () =>
    document.querySelector('form').dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })),
  )
  assert.deepEqual(writes, [])
  await click(button(document, '取消'))
  allowed = true
  await act(async () => editor.open('C'))
  await act(async () => loads.get('C').reject(new Error('回填失败')))
  assert.equal(button(document, '保存记录').disabled, true)
  assert.equal(editor.ready, false)
  assert.deepEqual(errors, ['回填失败'])
  await click(button(document, '取消'))
  await act(async () => editor.open('D'))
  await click(button(document, '取消'))
  await act(async () => loads.get('D').reject(new Error('过期失败')))
  assert.deepEqual(errors, ['回填失败'])
})

test('确认 Hook 共用默认弹窗：重复提交被拦截，失败保留，成功关闭，取消不执行', async t => {
  let confirm
  let request
  let writes = 0
  const errors = []
  function Fixture() {
    confirm = useMaConfirm({ onError: error => errors.push(error.message) })
    return createElement(MaDialog, { ...confirm.dialogProps })
  }
  await mount(t, Fixture)
  const options = {
    title: '删除记录',
    description: '确认删除吗？',
    okText: '执行删除',
    onConfirm: () => {
      writes++
      request = deferred()
      return request.promise
    },
  }
  await act(async () => confirm.open(options))
  await click(button(document, '取消'))
  assert.equal(writes, 0)
  await act(async () => confirm.open(options))
  await act(async () => {
    button(document, '执行删除').click()
    button(document, '执行删除').click()
  })
  assert.equal(writes, 1)
  assert.equal(button(document, '取消').disabled, true)
  await act(async () => confirm.open({ ...options, title: '另一条记录' }))
  assert.equal(confirm.dialogProps.title, '删除记录')
  await act(async () => request.reject(new Error('删除失败')))
  assert.equal(confirm.dialogProps.open, true)
  assert.deepEqual(errors, ['删除失败'])
  await click(button(document, '执行删除'))
  await act(async () => request.resolve())
  assert.equal(confirm.dialogProps.open, false)
})

test('MaProTable cancels hidden Activity work and resumes without accepting late data', async t => {
  const ref = createRef()
  const pending = []
  const options = {
    requestOptions: { api: (params, signal) => new Promise(resolve => pending.push({ params, signal, resolve })) },
  }
  const Wrapper = ({ mode }) =>
    createElement(
      Activity,
      { mode },
      createElement(MaProTable, {
        ref,
        options,
        schema: { tableColumns: [{ prop: 'id', label: 'ID' }] },
      }),
    )
  const view = await mount(t, Wrapper, { mode: 'visible' })
  const tick = () =>
    act(async () => {
      await new Promise(resolve => setTimeout(resolve, 15))
    })
  await tick()
  assert.equal(pending.length, 1)
  await view.render({ mode: 'hidden' })
  assert.equal(pending[0].signal.aborted, true)
  await act(async () => pending[0].resolve({ list: [{ id: 'stale-hidden' }], total: 1 }))
  await view.render({ mode: 'visible' })
  await tick()
  assert.equal(pending.length, 2)
  await act(async () => pending[1].resolve({ list: [{ id: 'resumed' }], total: 1 }))
  assert.equal(ref.current.getElTableStates().loading, false)
  assert.match(view.container.textContent, /resumed/)
  assert.doesNotMatch(view.container.textContent, /stale-hidden/)
  await act(async () => {
    void ref.current.refresh()
  })
  assert.equal(pending.length, 3)
  await act(async () => {
    void ref.current.refresh()
  })
  assert.equal(pending[2].signal.aborted, true)
  await act(async () => pending[3].resolve({ list: [], total: 0 }))
})
