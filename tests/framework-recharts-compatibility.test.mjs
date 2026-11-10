import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, afterEach, test } from 'node:test'

const require = createRequire(new URL('../package.json', import.meta.url))
const { Window } = require('happy-dom')
const window = new Window({ url: 'http://localhost/' })
for (const name of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'SVGElement',
  'Element',
  'Node',
  'Event',
  'ResizeObserver',
  'MutationObserver',
]) {
  Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? window : window[name] })
}
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = require('react')
const { act, createElement: h } = React
const { createRoot } = require('react-dom/client')
const { PieChart, Pie, Cell } = require('recharts')
const chartRequire = createRequire(require.resolve('recharts/package.json'))
const { findAllByType } = chartRequire('./lib/util/ReactUtils.js')
const ReactIs = chartRequire('react-is')
const roots = []
afterEach(async () => {
  await act(async () => roots.splice(0).forEach(root => root.unmount()))
  document.body.replaceChildren()
})
after(async () => {
  await window.happyDOM.abort()
  window.close()
})

const colors = ['#ef4444', '#22c55e', '#3b82f6']
const cells = () => colors.map((fill, index) => h(Cell, { key: index, fill }))

test('Recharts resolves a React 19 compatible peer and collects nested Fragment Cells', () => {
  const wrapped = h(React.Fragment, null, h(React.Fragment, null, cells()))
  assert.equal(React.version.split('.')[0], '19')
  assert.equal(chartRequire('react-is/package.json').version.split('.')[0], '19')
  assert.equal(ReactIs.isFragment(wrapped), true)
  assert.deepEqual(
    findAllByType(cells(), Cell).map(cell => cell.props.fill),
    colors,
  )
  assert.deepEqual(
    findAllByType(wrapped, Cell).map(cell => cell.props.fill),
    colors,
  )
})

test('Recharts renders the same sector colors for direct and Fragment Cells', async () => {
  const actual = []
  for (const fragment of [false, true]) {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    roots.push(root)
    const chart = h(
      PieChart,
      { width: 400, height: 400 },
      h(
        Pie,
        {
          data: [
            { name: 'A', value: 2 },
            { name: 'B', value: 3 },
            { name: 'C', value: 5 },
          ],
          dataKey: 'value',
          cx: 200,
          cy: 200,
          outerRadius: 100,
          isAnimationActive: false,
        },
        fragment ? h(React.Fragment, null, cells()) : cells(),
      ),
    )
    await act(async () => root.render(chart))
    const fills = [...container.querySelectorAll('.recharts-sector')].map(node => node.getAttribute('fill'))
    assert.deepEqual(fills, colors)
    actual.push(fills)
  }
  assert.deepEqual(actual[0], actual[1])
})
