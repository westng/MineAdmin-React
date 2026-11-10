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
  'Element',
  'Node',
  'NodeFilter',
  'MutationObserver',
  'ResizeObserver',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'FocusEvent',
  'DOMRect',
  'ShadowRoot',
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
  stdin: {
    contents: "export * from './src/components/reui/date-selector'",
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
const { DateSelector } = module.exports
const roots = []
afterEach(async () => {
  await act(async () => roots.splice(0).forEach(root => root.unmount()))
  document.body.replaceChildren()
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})
async function mount(props) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  let current = props
  const render = async changes => {
    current = { ...current, ...changes }
    await act(async () => root.render(h(DateSelector, current)))
  }
  await render({})
  return { container, render }
}

test('DateSelector earlier second date produces the complete normalized range', async () => {
  const changes = []
  const view = await mount({
    value: { period: 'day', operator: 'between', startDate: new Date(2026, 8, 19) },
    showTwoMonths: false,
    onChange: value => changes.push(value),
  })
  const earlier = [...view.container.querySelectorAll('button[data-day]')].find(node => node.textContent === '17')
  assert.ok(earlier)
  await act(async () => earlier.click())
  assert.equal(changes.at(-1).startDate.getDate(), 17)
  assert.equal(changes.at(-1).endDate.getDate(), 19)
})

test('DateSelector explicit year bounds override the baseYear and yearRange defaults', async () => {
  const view = await mount({ defaultPeriodType: 'year', baseYear: 2030, yearRange: 3, showInput: false })
  const years = () =>
    [...view.container.querySelectorAll('button')].map(node => node.textContent).filter(text => /^\d{4}$/.test(text))
  assert.deepEqual(years(), ['2029', '2030', '2031'])
  await view.render({ minYear: 2029, maxYear: 2031 })
  assert.deepEqual(years(), ['2029', '2030', '2031'])
})

test('DateSelector uncontrolled typed date persists after blur', async () => {
  const changes = []
  const view = await mount({
    inputHint: 'yyyy-MM-dd',
    dayDateFormat: 'yyyy-MM-dd',
    showTwoMonths: false,
    onChange: value => changes.push(value),
  })
  const input = view.container.querySelector('input[type="text"]')
  await act(async () => input.focus())
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setValue.call(input, '2026-09-19')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  assert.equal(changes.at(-1).startDate.getDate(), 19)
  assert.equal(input.value, '2026-09-19')
  await act(async () => input.blur())
  assert.equal(input.value, '2026-09-19')
})

async function enter(input, text) {
  await act(async () => {
    input.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
test('DateSelector invalid input keeps the last valid value and empty input clears it', async () => {
  const changes = []
  const view = await mount({
    inputHint: 'yyyy-MM-dd',
    dayDateFormat: 'yyyy-MM-dd',
    showTwoMonths: false,
    onChange: value => changes.push(value),
  })
  const input = view.container.querySelector('input[type="text"]')
  await enter(input, '2026-09-19')
  await act(async () => input.blur())
  assert.equal(input.value, '2026-09-19')
  const count = changes.length
  await enter(input, 'invalid synthetic date')
  await act(async () => input.blur())
  assert.equal(changes.length, count)
  assert.equal(input.value, '2026-09-19')
  assert.ok(view.container.querySelector('[role="alert"]'))
  await enter(input, '')
  await act(async () => input.blur())
  assert.equal(input.value, '')
  assert.equal(changes.at(-1).startDate, undefined)
  assert.equal(view.container.querySelector('[role="alert"]'), null)
})
test('DateSelector controlled input emits proposals and waits for the supplied value', async () => {
  const changes = []
  const view = await mount({
    value: { period: 'day', operator: 'is', startDate: new Date(2026, 8, 10) },
    inputHint: 'yyyy-MM-dd',
    dayDateFormat: 'yyyy-MM-dd',
    showTwoMonths: false,
    onChange: value => changes.push(value),
  })
  const input = view.container.querySelector('input[type="text"]')
  await enter(input, '2026-09-19')
  await act(async () => input.blur())
  assert.equal(changes.length, 1)
  assert.equal(changes[0].startDate.getDate(), 19)
  assert.equal(input.value, '2026-09-10')
  await view.render({ value: changes[0] })
  assert.equal(input.value, '2026-09-19')
  assert.equal(changes.length, 1)
  await view.render({ value: { period: 'day', operator: 'is' } })
  assert.equal(input.value, '')
})
test('DateSelector uncontrolled range supports backward, same-day and restarted selections', async () => {
  const changes = []
  const view = await mount({
    defaultFilterType: 'between',
    showTwoMonths: false,
    onChange: value => changes.push(value),
  })
  const day = n => [...view.container.querySelectorAll('button[data-day]')].find(node => node.textContent === String(n))
  await act(async () => day(19).click())
  await act(async () => day(17).click())
  assert.deepEqual([changes.at(-1).startDate.getDate(), changes.at(-1).endDate.getDate()], [17, 19])
  await act(async () => day(21).click())
  assert.equal(changes.at(-1).endDate, undefined)
  await act(async () => day(21).click())
  assert.deepEqual([changes.at(-1).startDate.getDate(), changes.at(-1).endDate.getDate()], [21, 21])
})
