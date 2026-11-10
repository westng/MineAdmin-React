import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { after, afterEach, test } from 'node:test'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
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
      "export * from './src/components/reui/data-grid/data-grid'; export * from './src/components/reui/data-grid/data-grid-table'; export * from './src/components/reui/data-grid/data-grid-cell-selection'",
    resolveDir: projectRoot,
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
) {
  const view = { table: null, changes: [], copies: [] }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  function Fixture() {
    const [rows, setRows] = React.useState(data)
    view.update = async nextRows =>
      act(async () => {
        setRows(nextRows)
      })
    const table = useTable({
      features: ui.dataGridFeatures,
      data: rows,
      columns,
      getRowId: row => row.id,
      manualPagination: true,
    })
    view.table = table
    return h(
      ui.DataGrid,
      {
        table,
        recordCount: rows.length,
        tableLayout: { cellSelection: true, cellFillHandle: true },
        onCellsChange: details => view.changes.push(details),
        onCellsCopy: details => {
          view.copies.push(details)
          view.onCopy?.(details)
        },
      },
      h(ui.DataGridContainer, null, h(ui.DataGridTable), h(ui.DataGridCellSelection)),
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

test('DataGrid delayed cut clears the copied cells after selection changes', async () => {
  let finishClipboard
  const copied = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: text => {
        copied.push(text)
        return new Promise(resolve => {
          finishClipboard = resolve
        })
      },
    },
  })
  const view = await mount()
  await view.focus('a')
  assert.equal(view.table.getCellSelectionBounds().length, 1)
  await view.key('x', { ctrlKey: true, code: 'KeyX' })
  assert.deepEqual(copied, ['Value A'])
  assert.deepEqual(view.changes, [])
  await view.focus('b')
  await act(async () => finishClipboard())
  assert.equal(view.changes.length, 1)
  assert.equal(view.changes[0].source, 'cut')
  assert.deepEqual(
    view.changes[0].changes.map(change => [change.rowId, change.previousValue, change.value]),
    [['a', 'Value A', null]],
  )
})

function pendingClipboard() {
  const writes = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: text => new Promise((resolve, reject) => writes.push({ text, resolve, reject })),
    },
  })
  return writes
}

async function finish(write) {
  await act(async () => write.resolve())
}

test('DataGrid unmount cancels a pending cut callback', async () => {
  const writes = pendingClipboard()
  const view = await mount()
  await view.focus('a')
  await view.key('x', { ctrlKey: true })
  await view.unmount()
  await finish(writes[0])
  assert.deepEqual(view.changes, [])
  assert.deepEqual(view.copies, [])
})

for (const value of ['Value A', 'new value']) {
  test('DataGrid pending cut does not clear a replacement dataset: ' + value, async () => {
    const writes = pendingClipboard()
    const view = await mount()
    await view.focus('a')
    await view.key('x', { ctrlKey: true })
    await view.update([
      { id: 'a', value },
      { id: 'b', value: 'Value B' },
    ])
    await finish(writes[0])
    assert.deepEqual(view.changes, [])
  })
}

test('DataGrid pending cut follows stable row identity after reordering', async () => {
  const writes = pendingClipboard()
  const a = { id: 'a', value: 'Value A' }
  const b = { id: 'b', value: 'Value B' }
  const view = await mount([a, b])
  await view.focus('a')
  await view.key('x', { ctrlKey: true })
  await view.update([b, a])
  await finish(writes[0])
  assert.deepEqual(
    view.changes[0].changes.map(change => [change.rowId, change.row]),
    [['a', a]],
  )
})

test('DataGrid a newer clipboard operation supersedes an older pending cut', async () => {
  const writes = pendingClipboard()
  const view = await mount()
  await view.focus('a')
  await view.key('x', { ctrlKey: true })
  await view.focus('b')
  await view.key('x', { ctrlKey: true })
  await finish(writes[1])
  await finish(writes[0])
  assert.equal(view.changes.length, 1)
  assert.deepEqual(
    view.changes[0].changes.map(change => change.rowId),
    ['b'],
  )
})

test('DataGrid denied clipboard write does not clear data', async () => {
  const writes = pendingClipboard()
  const view = await mount()
  await view.focus('a')
  await view.key('x', { ctrlKey: true })
  await act(async () => writes[0].reject(new Error('denied')))
  assert.deepEqual(view.changes, [])
})

test('DataGrid native cut snapshots cells before onCellsCopy changes selection', async () => {
  const view = await mount()
  await view.focus('a')
  view.onCopy = () => view.table.setFocusedCell('b', 'value')
  const flavors = new Map()
  const event = new Event('cut', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { setData: (type, value) => flavors.set(type, value) } })
  await act(async () => view.container.querySelector('table').dispatchEvent(event))
  assert.equal(flavors.get('text/plain'), 'Value A')
  assert.deepEqual(
    view.changes[0].changes.map(change => change.rowId),
    ['a'],
  )
})

test('DataGrid copy reports copied cells without changing them', async () => {
  const writes = pendingClipboard()
  const view = await mount()
  await view.focus('a')
  await view.key('c', { ctrlKey: true })
  await finish(writes[0])
  assert.equal(view.copies[0].cut, false)
  assert.deepEqual(view.changes, [])
})
