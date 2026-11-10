import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, afterEach, test } from 'node:test'

import { fileURLToPath } from 'node:url'
const require = createRequire(new URL('../package.json', import.meta.url))
const { build } = await import(require.resolve('esbuild'))
const { Window } = await import(require.resolve('happy-dom'))
const dom = new Window({ url: 'http://localhost/' })
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLButtonElement',
  'HTMLTextAreaElement',
  'Element',
  'Node',
  'NodeFilter',
  'MutationObserver',
  'ResizeObserver',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'PointerEvent',
  'FocusEvent',
  'DOMRect',
  'ShadowRoot',
  'CSS',
]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
}
Object.defineProperty(globalThis, 'ClipboardItem', { configurable: true, value: undefined })
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = require('react')
const { act, createElement: h } = React
const { createRoot } = require('react-dom/client')
const { useTable } = require('@tanstack/react-table')
const result = await build({
  stdin: {
    contents:
      "export * from './src/components/reui/data-grid/data-grid'; export * from './src/components/reui/data-grid/data-grid-table'; export * from './src/components/reui/data-grid/data-grid-cell-selection'; export * from './src/components/reui/data-grid/data-grid-table-virtual'",
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const ui = module.exports
const roots = []
afterEach(async () => {
  await act(async () => roots.splice(0).forEach(root => root.unmount()))
  document.body.replaceChildren()
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})
const settle = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 25))
  })
const columns = [
  { accessorKey: 'value', header: 'Synthetic value', meta: { cellEdit: { control: 'text', clearValue: null } } },
]
async function mount(
  data = [
    { id: 'a', value: 'Value A' },
    { id: 'b', value: 'Value B' },
  ],
  virtualProps,
  tableOptions = {},
) {
  const view = { table: null, changes: [] }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  function Fixture() {
    const [rows, setRows] = React.useState(data)
    const [currentVirtualProps, setVirtualProps] = React.useState(virtualProps)
    view.update = async (nextRows, nextProps) =>
      act(async () => {
        setRows(nextRows)
        setVirtualProps(nextProps)
      })
    const table = useTable({
      features: ui.dataGridFeatures,
      data: rows,
      columns,
      getRowId: row => row.id,
      manualPagination: true,
      ...tableOptions,
    })
    view.table = table
    return h(
      ui.DataGrid,
      {
        table,
        recordCount: rows.length,
        tableLayout: { cellSelection: true, cellFillHandle: true },
        onCellsChange: details => view.changes.push(details),
      },
      h(
        ui.DataGridContainer,
        null,
        currentVirtualProps ? h(ui.DataGridTableVirtual, currentVirtualProps) : h(ui.DataGridTable),
        h(ui.DataGridCellSelection),
      ),
    )
  }
  await act(async () => root.render(h(Fixture)))
  await settle()
  view.container = container
  view.focus = async id => {
    await act(async () => view.table.setFocusedCell(id, 'value'))
    await settle()
  }
  view.key = async (name, options = {}, target = container.querySelector('table')) => {
    await act(async () =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options })),
    )
  }
  view.unmount = async () => {
    roots.splice(roots.indexOf(root), 1)
    await act(async () => root.unmount())
  }
  return view
}

test('DataGrid IME candidate Enter waits for composition to finish', async () => {
  const view = await mount()
  await view.focus('a')
  await view.key('Enter')
  const editor = view.container.querySelector('[data-slot="data-grid-cell-editor"]')
  assert.ok(editor)
  editor.value = '中文候选'
  await view.key('Enter', { isComposing: true }, editor)
  assert.equal(view.changes.length, 0)
  await view.key('Enter', { keyCode: 229 }, editor)
  assert.equal(view.changes.length, 0)
  await act(async () => editor.dispatchEvent(new dom.CompositionEvent('compositionstart', { bubbles: true })))
  await view.key('Enter', {}, editor)
  assert.equal(view.changes.length, 0)
  assert.ok(view.container.querySelector('[data-slot="data-grid-cell-editor"]'))
  await act(async () => editor.dispatchEvent(new dom.CompositionEvent('compositionend', { bubbles: true })))
  await view.key('Enter', {}, editor)
  assert.equal(view.changes.length, 1)
  assert.equal(view.changes[0].changes[0].value, '中文候选')
  assert.equal(view.container.querySelector('[data-slot="data-grid-cell-editor"]'), null)
})

test('DataGrid unmount cancels the active fill gesture', async () => {
  const view = await mount()
  await view.focus('a')
  const handle = view.container.querySelector('[data-slot="data-grid-cell-fill-handle"]')
  const target = view.container.querySelector('tr[data-row-id="b"] td[data-col-id="value"]')
  assert.ok(handle)
  assert.ok(target)
  const original = document.elementFromPoint
  document.elementFromPoint = () => target
  try {
    await act(async () =>
      handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })),
    )
    await act(async () =>
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 10, clientY: 30 })),
    )
    assert.equal(target.getAttribute('data-cell-fill-target'), 'true')
    await view.unmount()
    assert.equal(view.changes.length, 0)
    await act(async () => document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })))
    assert.equal(view.changes.length, 0)
  } finally {
    document.elementFromPoint = original
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  }
})

test('DataGrid distinct row ids have unique DOM identities and active descendants', async () => {
  const view = await mount([
    { id: 'a.b', value: 'First' },
    { id: 'a_b', value: 'Second' },
  ])
  const first = view.container.querySelector('tr[data-row-id="a.b"] td')
  const second = view.container.querySelector('tr[data-row-id="a_b"] td')
  assert.notEqual(first.id, second.id)
  await view.focus('a_b')
  assert.equal(view.table.getFocusedCell().row.id, 'a_b')
  assert.equal(document.getElementById(second.id), second)
})

const virtualOffsets = new WeakMap()
const virtualScrolls = []
const fixedVirtualGeometry = {
  height: 96,
  estimateSize: 48,
  overscan: 0,
  virtualizerOptions: {
    initialRect: { width: 600, height: 96 },
    observeElementRect: (instance, callback) => {
      if (instance.scrollElement) {
        Object.defineProperty(instance.scrollElement, 'clientHeight', { configurable: true, get: () => 96 })
        Object.defineProperty(instance.scrollElement, 'scrollHeight', {
          configurable: true,
          get: () => instance.getTotalSize(),
        })
      }
      callback({ width: 600, height: 96 })
      return () => {}
    },
    observeElementOffset: (instance, callback) => {
      virtualOffsets.set(instance, callback)
      callback(0, false)
      return () => virtualOffsets.delete(instance)
    },
    scrollToFn: (offset, _options, instance) => {
      virtualScrolls.push(offset)
      if (instance.scrollElement) instance.scrollElement.scrollTop = offset
      virtualOffsets.get(instance)?.(offset, false)
    },
  },
}

test('DataGrid virtual window edge advances to and mounts the next model row', async () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ id: `row-${i}`, value: `Value ${i}` }))
  const view = await mount(rows, fixedVirtualGeometry)
  const visible = [...view.container.querySelectorAll('tbody tr[data-row-id]')].map(node => node.dataset.rowId)
  assert.ok(visible.length > 0 && visible.length < rows.length)
  const last = visible.at(-1)
  await view.focus(last)
  const table = view.container.querySelector('table')
  await act(async () => table.focus())
  await view.key('ArrowDown')
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 80))
  })
  const model = view.table.getRowsInDisplayOrder()
  const next = model[model.findIndex(row => row.id === last) + 1]
  assert.ok(next)
  assert.equal(view.table.getFocusedCell().row.id, next.id)
  const cell = view.container.querySelector(`tr[data-row-id="${next.id}"] td[data-col-id="value"]`)
  assert.ok(
    cell,
    JSON.stringify({
      expected: next.id,
      scrolls: virtualScrolls,
      visible: [...view.container.querySelectorAll('tbody tr[data-row-id]')].map(row => row.dataset.rowId),
    }),
  )
  assert.ok(virtualScrolls.some(offset => offset > 0))
  assert.equal(document.activeElement, table)
  assert.equal(table.getAttribute('aria-activedescendant'), cell.id)
})

test('DataGrid virtual fetch-more starts the next source even with an unchanged row count', async () => {
  const calls = []
  const propsA = { ...fixedVirtualGeometry, hasMore: true, onFetchMore: () => calls.push('A') }
  const view = await mount(
    [
      { id: 'a1', value: 'A1' },
      { id: 'a2', value: 'A2' },
    ],
    propsA,
  )
  assert.deepEqual(calls, ['A'])
  const propsB = { ...fixedVirtualGeometry, hasMore: true, onFetchMore: () => calls.push('B') }
  await view.update(
    [
      { id: 'b1', value: 'B1' },
      { id: 'b2', value: 'B2' },
    ],
    propsB,
  )
  await settle()
  assert.deepEqual(
    view.table.getRowModel().rows.map(row => row.id),
    ['b1', 'b2'],
  )
  assert.deepEqual(calls, ['A', 'B'])
})

async function startFill(view, targetId = 'b') {
  await view.focus('a')
  const handle = view.container.querySelector('[data-slot="data-grid-cell-fill-handle"]')
  const target = view.container.querySelector(`tr[data-row-id="${targetId}"] td[data-col-id="value"]`)
  document.elementFromPoint = () => target
  await act(async () =>
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })),
  )
  await act(async () =>
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 10, clientY: 30 })),
  )
  return target
}
test('DataGrid normal fill commits once and another grid owns its own cleanup', async () => {
  const original = document.elementFromPoint
  const first = await mount(),
    second = await mount()
  try {
    await startFill(first)
    await startFill(second)
    await first.unmount()
    await act(async () => document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })))
    await act(async () => document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })))
    assert.equal(first.changes.length, 0)
    assert.equal(second.changes.length, 1)
    assert.deepEqual(
      second.changes[0].changes.map(change => [change.rowId, change.value]),
      [['b', 'Value A']],
    )
  } finally {
    document.elementFromPoint = original
  }
})
test('DataGrid changing data during fill cancels the gesture without a write', async () => {
  const original = document.elementFromPoint,
    view = await mount()
  try {
    await startFill(view)
    await view.update([
      { id: 'a', value: 'Changed A' },
      { id: 'b', value: 'Changed B' },
    ])
    await settle()
    await act(async () => document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })))
    assert.equal(view.changes.length, 0)
  } finally {
    document.elementFromPoint = original
  }
})
test('DataGrid DOM encodings remain unique across separators and grid instances', async () => {
  const first = await mount([{ id: 'a-b', value: 'A' }]),
    second = await mount([{ id: 'a-b', value: 'B' }])
  assert.notEqual(first.container.querySelector('td').id, second.container.querySelector('td').id)
  assert.notEqual(
    `${ui.toDataGridDomId('a-b')}-${ui.toDataGridDomId('c')}`,
    `${ui.toDataGridDomId('a')}-${ui.toDataGridDomId('b-c')}`,
  )
})
test('DataGrid arrow navigation stops at the real pagination boundaries', async () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({ id: `row-${i}`, value: `Value ${i}` }))
  const view = await mount(rows, fixedVirtualGeometry, {
    manualPagination: false,
    initialState: { pagination: { pageIndex: 1, pageSize: 2 } },
  })
  const pageRows = view.table.getRowModel().rows
  assert.deepEqual(
    pageRows.map(row => row.id),
    ['row-2', 'row-3'],
  )
  await view.focus('row-3')
  await view.key('ArrowDown')
  assert.equal(view.table.getFocusedCell().row.id, 'row-3')
  await view.focus('row-2')
  await view.key('ArrowUp')
  assert.equal(view.table.getFocusedCell().row.id, 'row-2')
})
test('DataGrid fetch-more retries a changed query key or callback but not an unchanged source', async () => {
  const rows = [
      { id: 'a1', value: 'A1' },
      { id: 'a2', value: 'A2' },
    ],
    calls = []
  const first = () => calls.push('first'),
    next = () => calls.push('next')
  const props = { ...fixedVirtualGeometry, hasMore: true, onFetchMore: first, fetchMoreKey: 'A' }
  const view = await mount(rows, props)
  await view.update([...rows], { ...props })
  await settle()
  assert.deepEqual(calls, ['first'])
  await view.update(rows, { ...props, onFetchMore: next })
  await settle()
  assert.deepEqual(calls, ['first', 'next'])
  await view.update(rows, { ...props, onFetchMore: next, fetchMoreKey: 'B' })
  await settle()
  assert.deepEqual(calls, ['first', 'next', 'next'])
})
