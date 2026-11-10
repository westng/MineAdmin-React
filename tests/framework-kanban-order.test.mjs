import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../package.json', import.meta.url))
const webRoot = fileURLToPath(new URL('../', import.meta.url))
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
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = require('react')
const { act, createElement: h } = React
const { createRoot } = require('react-dom/client')
const result = await build({
  stdin: { contents: "export * from './src/components/reui/kanban'", resolveDir: webRoot },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
})
let capturedDndProps
const realDnd = require('@dnd-kit/core')
function TraceDnd(props) {
  capturedDndProps = props
  return h(realDnd.DndContext, props)
}
const testRequire = name => (name === '@dnd-kit/core' ? { ...realDnd, DndContext: TraceDnd } : require(name))
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, testRequire)
const ui = module.exports
const roots = []
afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach(root => root.unmount())
  })
  document.body.replaceChildren()
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

async function mount(initial, { controlled = true, echoOrder = true } = {}) {
  const view = { commits: [], changes: [], orders: [], container: document.createElement('div') }
  document.body.append(view.container)
  const root = createRoot(view.container)
  roots.push(root)
  function Fixture() {
    const [value, setValue] = React.useState(initial)
    const [order, setOrder] = React.useState(Object.keys(initial))
    view.value = value
    view.order = order
    view.setValue = next => act(async () => setValue(next))
    view.setOrder = next => act(async () => setOrder(next))
    return h(
      ui.Kanban,
      {
        value,
        getItemValue: item => item.id,
        columnOrder: controlled ? order : undefined,
        onColumnOrderChange: next => {
          view.orders.push(next)
          if (echoOrder) setOrder(next)
        },
        onValueChange: next => {
          view.changes.push(next)
          setValue(next)
        },
        onValueCommit: (next, meta) => view.commits.push({ next, meta }),
      },
      h(ui.KanbanBoard, null, ...Object.keys(value).map(id => h(ui.KanbanColumn, { key: id, value: id }, id))),
    )
  }
  await act(async () => root.render(h(Fixture)))
  view.renderedOrder = () =>
    [...view.container.querySelectorAll('[data-slot="kanban-column"]')].map(node => node.dataset.value)
  return view
}
const drag = async (first, second) => {
  await act(async () => capturedDndProps.onDragStart({ active: { id: first } }))
  await act(async () => capturedDndProps.onDragEnd({ active: { id: first }, over: { id: second } }))
}

// The real DndContext and columns render; synthetic callbacks exercise the
// confirmed commit boundary, not the timing of physical browser sensors.
for (const [first, second] of [
  ['1', '2'],
  ['first', 'second'],
]) {
  test(`Kanban ${first}/${second} columns retain the explicit order after parent updates`, async () => {
    const view = await mount({ [first]: [], [second]: [] })
    await drag(first, second)
    assert.equal(view.changes.length, 1)
    assert.deepEqual(view.order, [second, first])
    assert.deepEqual(view.renderedOrder(), [second, first])
    assert.equal(view.commits.length, 1)
    assert.deepEqual(view.commits[0].meta.columnOrder, [second, first])
    assert.deepEqual(view.commits[0].meta.previousColumnOrder, [first, second])
    assert.equal(view.commits[0].meta.activeIndex, 0)
    assert.equal(view.commits[0].meta.overIndex, 1)
    assert.deepEqual(Object.keys(view.value).sort(), [first, second].sort())
    await view.setValue({ ...view.value })
    assert.deepEqual(view.renderedOrder(), [second, first])
    await drag(first, second)
    assert.deepEqual(view.order, [first, second])
    assert.deepEqual(view.renderedOrder(), [first, second])
  })
}

test('Kanban uncontrolled numeric order survives value echoes and new columns', async () => {
  const view = await mount({ 1: [], 2: [] }, { controlled: false, echoOrder: false })
  await drag('1', '2')
  assert.deepEqual(view.orders, [['2', '1']])
  assert.deepEqual(view.renderedOrder(), ['2', '1'])
  await view.setValue({ 1: [], 2: [], 3: [] })
  assert.deepEqual(view.renderedOrder(), ['2', '1', '3'])
})

test('Kanban controlled order remains authoritative until the parent accepts it', async () => {
  const view = await mount({ 1: [], 2: [] }, { echoOrder: false })
  await drag('1', '2')
  assert.deepEqual(view.renderedOrder(), ['1', '2'])
  assert.deepEqual(view.commits[0].meta.columnOrder, ['2', '1'])
  await view.setOrder(['2', '1'])
  assert.deepEqual(view.renderedOrder(), ['2', '1'])
})

test('Kanban cancelled column drags emit no order commit', async () => {
  const view = await mount({ 1: [], 2: [] })
  await act(async () => capturedDndProps.onDragStart({ active: { id: '1' } }))
  await act(async () => capturedDndProps.onDragCancel({ active: { id: '1' } }))
  assert.deepEqual(view.renderedOrder(), ['1', '2'])
  assert.equal(view.orders.length, 0)
  assert.equal(view.commits.length, 0)
})
