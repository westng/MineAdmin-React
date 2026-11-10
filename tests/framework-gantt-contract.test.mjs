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
  stdin: {
    contents:
      "export * from './src/components/reui/gantt/gantt'; export * from './src/components/reui/gantt/gantt-view'; export * from './src/components/reui/gantt/gantt-dnd'; export * from './src/components/reui/gantt/gantt-lib'; export * from './src/components/reui/gantt/gantt-recurrence'",
    resolveDir: webRoot,
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
  await act(async () => {
    ui.cancelActiveGanttGestures()
    roots.splice(0).forEach(root => root.unmount())
  })
  document.body.replaceChildren()
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

const date = value => new Date(value)
const anchor = date('2026-09-01T00:00:00Z')
const sample = () => ({
  id: 'sample',
  title: 'Synthetic task',
  resourceId: 'room',
  start: date('2026-09-01T09:00:00Z'),
  end: date('2026-09-01T10:00:00Z'),
})
const settle = (ms = 20) =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms))
  })
const range = (start, end) => ({ start: date(start), end: date(end) })
function rect(element, x, y, width, height) {
  assert.ok(element)
  element.getBoundingClientRect = () => new DOMRect(x, y, width, height)
}
async function pointer(target, type, x, y) {
  await act(async () =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        pointerType: 'mouse',
        pointerId: 1,
        clientX: x,
        clientY: y,
      }),
    ),
  )
}
async function mount(options = {}, withView = false) {
  const view = { container: document.createElement('div') }
  document.body.append(view.container)
  const root = createRoot(view.container)
  roots.push(root)
  function Probe() {
    view.calendar = ui.useGantt()
    return null
  }
  function Fixture() {
    const [props, setProps] = React.useState(options)
    const [visible, setVisible] = React.useState(true)
    view.replace = async patch => act(async () => setProps(old => ({ ...old, ...patch })))
    view.hide = async () => act(async () => setVisible(false))
    return visible
      ? h(
          ui.Gantt,
          {
            timeZone: 'UTC',
            defaultDate: anchor,
            defaultScale: 'day',
            nowIndicator: false,
            infiniteScroll: false,
            scrollbars: 'native',
            zoomControl: false,
            offscreenIndicators: false,
            initialCenter: 'anchor',
            resources: [{ id: 'room', title: 'Synthetic room' }],
            ...props,
          },
          h(Probe),
          withView ? h(ui.GanttView) : null,
        )
      : null
  }
  await act(async () => root.render(h(Fixture)))
  await settle()
  return view
}
async function resizeEnd(view) {
  rect(view.container.querySelector('[data-gantt-axis]'), 0, 0, 1440, 32)
  rect(view.container.querySelector('[data-gantt-row]'), 0, 40, 1440, 40)
  const handle = view.container.querySelector('[data-slot="gantt-resize-handle"][data-edge="end"]')
  await pointer(handle, 'pointerdown', 600, 60)
  await pointer(window, 'pointermove', 660, 60)
}

test('Gantt explicit and implicit cached ranges retain a milestone at their start', async () => {
  const view = await mount({ defaultEvents: [{ ...sample(), start: anchor, end: anchor }] })
  const api = view.calendar.api
  assert.equal(api.getOccurrences().length, 1)
  assert.equal(api.getOccurrences(api.getVisibleRange()).length, 1)
  assert.equal(ui.expandRecurrence(api.getEvent('sample'), api.getVisibleRange(), { timeZone: 'UTC' }).length, 1)
})

test('Gantt invalidates cached occurrences when the expansion callback changes', async () => {
  let replacements = 0
  const first = () => [{ start: date('2026-09-01T09:00:00Z'), end: date('2026-09-01T10:00:00Z') }]
  const second = () => {
    replacements++
    return [{ start: date('2026-09-01T11:00:00Z'), end: date('2026-09-01T12:00:00Z') }]
  }
  const view = await mount({ defaultEvents: [sample()], getOccurrences: first })
  assert.equal(view.calendar.api.getOccurrences()[0].start.getUTCHours(), 9)
  await view.replace({ getOccurrences: second })
  assert.equal(view.calendar.settings.getOccurrences, second)
  assert.equal(view.calendar.api.getOccurrences()[0].start.getUTCHours(), 11)
  assert.equal(replacements, 1)
  assert.equal(
    view.calendar.api.getOccurrences(range('2026-08-31T00:00:00Z', '2026-09-03T00:00:00Z'))[0].start.getUTCHours(),
    11,
  )
  assert.equal(replacements, 2)
})

test('Gantt invalidates the cached order when the comparator changes', async () => {
  const byId = (a, b) => a.eventId.localeCompare(b.eventId)
  const view = await mount({
    defaultEvents: [
      { ...sample(), id: 'a' },
      { ...sample(), id: 'b' },
    ],
    eventOrder: byId,
  })
  assert.deepEqual(
    view.calendar.api.getOccurrences().map(o => o.eventId),
    ['a', 'b'],
  )
  await view.replace({ eventOrder: (a, b) => -byId(a, b) })
  assert.deepEqual(
    view.calendar.api.getOccurrences().map(o => o.eventId),
    ['b', 'a'],
  )
  await act(async () => view.calendar.api.setEvents([...view.calendar.api.getEvents()]))
  assert.deepEqual(
    view.calendar.api.getOccurrences().map(o => o.eventId),
    ['b', 'a'],
  )
})

test('Gantt monthly RRULE skips invalid dates without drifting or consuming COUNT', () => {
  const event = {
    ...sample(),
    start: date('2026-01-31T09:00:00Z'),
    end: date('2026-01-31T10:00:00Z'),
    recurrence: 'FREQ=MONTHLY;COUNT=3',
  }
  const occurrences = ui.expandRecurrence(event, range('2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'), {
    timeZone: 'UTC',
  })
  assert.deepEqual(
    occurrences.map(o => o.start.toISOString().slice(0, 10)),
    ['2026-01-31', '2026-03-31', '2026-05-31'],
  )
})

test('Gantt weekly UNTIL includes the eligible earlier day in the final week', () => {
  const event = { ...sample(), recurrence: 'FREQ=WEEKLY;BYDAY=MO,TU;UNTIL=20260907T235959Z' }
  const occurrences = ui.expandRecurrence(event, range('2026-09-01T00:00:00Z', '2026-09-10T00:00:00Z'), {
    timeZone: 'UTC',
  })
  assert.deepEqual(
    occurrences.map(o => o.start.toISOString().slice(0, 10)),
    ['2026-09-01', '2026-09-07'],
  )
})

test('Gantt interval weeks honor explicit WKST', () => {
  const dates = weekStart =>
    ui
      .expandRecurrence(
        { ...sample(), recurrence: `FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,SU;COUNT=4;WKST=${weekStart}` },
        range('2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'),
        { timeZone: 'UTC' },
      )
      .map(o => o.start.toISOString().slice(0, 10))
  assert.deepEqual(dates('MO'), ['2026-09-01', '2026-09-06', '2026-09-15', '2026-09-20'])
  assert.deepEqual(dates('SU'), ['2026-09-01', '2026-09-13', '2026-09-15', '2026-09-27'])
})

test('Gantt recurring all-day duration ends at the next local midnight across DST', () => {
  const event = {
    ...sample(),
    allDay: true,
    start: date('2026-03-07T00:00:00-05:00'),
    end: date('2026-03-08T00:00:00-05:00'),
    recurrence: 'FREQ=DAILY;COUNT=3',
  }
  const occurrences = ui.expandRecurrence(event, range('2026-03-07T00:00:00-05:00', '2026-03-11T00:00:00-04:00'), {
    timeZone: 'America/New_York',
  })
  assert.equal(occurrences.length, 3)
  assert.equal(ui.toZoned(occurrences[1].end, 'America/New_York').getHours(), 0)
  assert.equal(occurrences[1].end.getTime() - date('2026-03-09T00:00:00-04:00').getTime(), 0)
})

test('Gantt final and intermediate time units create complete slots', async () => {
  const selected = []
  const view = await mount({ dragCreate: true, onSelectSlot: slot => selected.push(slot) }, true)
  const row = view.container.querySelector('[data-gantt-row]')
  rect(row, 0, 40, 1440, 40)
  for (const x of [750, 1410]) {
    await act(async () => row.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: 60 })))
  }
  assert.equal(selected.length, 2)
  assert.equal(selected[0].end - selected[0].start, 3600000)
  assert.equal(selected[1].start.getUTCHours(), 23)
  assert.equal(selected[1].end - selected[1].start, 3600000)
})

test('Gantt click-only hint has a working pointer target and native button activation', async () => {
  const selected = []
  const view = await mount({ displayScheduleHint: true, onSelectSlot: slot => selected.push(slot) }, true)
  const row = view.container.querySelector('[data-gantt-row]')
  rect(row, 0, 40, 1440, 40)
  await pointer(row, 'pointermove', 750, 60)
  const tile = view.container.querySelector('[data-slot="gantt-schedule-hint-tile"]')
  assert.ok(tile)
  assert.ok(tile.classList.contains('pointer-events-none'))
  await act(async () => row.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 750, clientY: 60 })))
  assert.equal(selected.length, 1)
  await pointer(row, 'pointermove', 750, 60)
  const button = view.container.querySelector('[data-slot="gantt-schedule-hint-tile"]')
  assert.equal(button.type, 'button')
  await act(async () => {
    button.focus()
    button.click()
  })
  assert.equal(selected.length, 2)
})

test('Gantt resizing a later recurrence keeps the original series start', async () => {
  const view = await mount(
    { defaultDate: date('2026-09-15T00:00:00Z'), defaultEvents: [{ ...sample(), recurrence: 'FREQ=WEEKLY;COUNT=4' }] },
    true,
  )
  await resizeEnd(view)
  await pointer(window, 'pointerup', 660, 60)
  assert.equal(view.calendar.api.getEvent('sample').start.getTime(), date('2026-09-01T09:00:00Z').getTime())
  assert.equal(view.calendar.api.getEvent('sample').end.getUTCHours(), 11)
  assert.equal(
    view.calendar.api
      .getOccurrences(range('2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'))
      .some(o => o.start < date('2026-09-15T00:00:00Z')),
    true,
  )
})

test('Gantt enforceCanDrop rejects the invalid resize as its contract promises', async () => {
  const view = await mount({ defaultEvents: [sample()], canDropEvent: () => false, enforceCanDrop: true }, true)
  await resizeEnd(view)
  assert.equal(view.calendar.getState().drag.valid, false)
  await pointer(window, 'pointerup', 660, 60)
  assert.equal(view.calendar.api.getEvent('sample').end.getUTCHours(), 10)
})

test('Gantt splitter is cancelled on unmount without committing a width', async () => {
  const widths = []
  const view = await mount({ treePanel: { onWidthChange: width => widths.push(width) } }, true)
  const splitter = view.container.querySelector('[data-slot="gantt-splitter"]')
  await pointer(splitter, 'pointerdown', 288, 20)
  await pointer(window, 'pointermove', 320, 20)
  await view.hide()
  assert.equal(view.container.childElementCount, 0)
  await pointer(window, 'pointerup', 320, 20)
  assert.deepEqual(widths, [])
})

test('Gantt resource reorder removes its overlay and cancels on unmount', async () => {
  const proposals = []
  const view = await mount(
    {
      resources: [
        { id: 'a', title: 'Synthetic A' },
        { id: 'b', title: 'Synthetic B' },
      ],
      onResourceReorder: p => proposals.push(p),
    },
    true,
  )
  rect(view.container.querySelector('[data-slot="gantt-tree-pane"]'), 0, 0, 288, 200)
  const rows = view.container.querySelectorAll('[data-slot="gantt-row-group"]')
  rect(rows[0], 0, 65, 288, 40)
  rect(rows[1], 0, 105, 288, 40)
  await pointer(rows[0].querySelector('[data-slot="gantt-row-grip"]'), 'pointerdown', 12, 85)
  await pointer(window, 'pointermove', 12, 150)
  await view.hide()
  assert.equal(view.container.childElementCount, 0)
  assert.equal(document.querySelector('[data-slot="gantt-drag-overlay"]'), null)
  await pointer(window, 'pointerup', 12, 150)
  assert.equal(proposals.length, 0)
})

test('Gantt offscreen chip refreshes its label when only the event title changes', async () => {
  const view = await mount({ offscreenIndicators: true, defaultEvents: [sample()] }, true)
  const pane = view.container.querySelector('[data-slot="gantt-timeline-pane"]')
  const viewport = pane.querySelector('[data-slot="scroll-area-viewport"]')
  rect(pane, 288, 0, 200, 300)
  rect(pane.querySelector('[data-slot="gantt-timeline-header"]'), 288, 0, 1000, 65)
  rect(pane.querySelector('[data-gantt-row]'), 288, 65, 1000, 40)
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 200 })
  Object.defineProperty(viewport, 'scrollWidth', { configurable: true, value: 1000 })
  await act(async () => viewport.dispatchEvent(new Event('scroll')))
  await settle(30)
  const chip = () => view.container.querySelector('[data-slot="gantt-offscreen-chip"]')
  assert.ok(chip())
  assert.match(chip().getAttribute('aria-label'), /Synthetic task/)
  await act(async () => view.calendar.api.updateEvent('sample', { title: 'Renamed synthetic task' }))
  await settle(30)
  assert.equal(view.calendar.api.getEvent('sample').title, 'Renamed synthetic task')
  assert.match(chip().getAttribute('aria-label'), /Renamed synthetic task/)
})

test('Gantt splitter completes once and pointer cancellation restores the width', async () => {
  const widths = []
  const view = await mount({ treePanel: { onWidthChange: width => widths.push(width) } }, true)
  const splitter = view.container.querySelector('[data-slot="gantt-splitter"]')
  await pointer(splitter, 'pointerdown', 288, 20)
  await pointer(window, 'pointermove', 320, 20)
  await pointer(window, 'pointerup', 320, 20)
  await pointer(window, 'pointerup', 320, 20)
  assert.deepEqual(widths, [320])
  await pointer(splitter, 'pointerdown', 320, 20)
  await pointer(window, 'pointermove', 360, 20)
  await pointer(window, 'pointercancel', 360, 20)
  assert.deepEqual(widths, [320])
  assert.equal(view.container.querySelector('[data-slot="gantt-tree-pane"]').style.width, '320px')
})

test('Gantt resource reorder completes once and is isolated from another unmount', async () => {
  const proposals = []
  const another = await mount({}, true)
  const view = await mount(
    {
      resources: [
        { id: 'a', title: 'Synthetic A' },
        { id: 'b', title: 'Synthetic B' },
      ],
      onResourceReorder: p => proposals.push(p),
    },
    true,
  )
  rect(view.container.querySelector('[data-slot="gantt-tree-pane"]'), 0, 0, 288, 200)
  const rows = view.container.querySelectorAll('[data-slot="gantt-row-group"]')
  rect(rows[0], 0, 65, 288, 40)
  rect(rows[1], 0, 105, 288, 40)
  await pointer(rows[0].querySelector('[data-slot="gantt-row-grip"]'), 'pointerdown', 12, 85)
  await pointer(window, 'pointermove', 12, 150)
  await another.hide()
  assert.ok(document.querySelector('[data-slot="gantt-drag-overlay"]'))
  await pointer(window, 'pointerup', 12, 150)
  await pointer(window, 'pointerup', 12, 150)
  assert.equal(proposals.length, 1)
  assert.deepEqual(
    proposals[0].resources.map(r => r.id),
    ['b', 'a'],
  )
  assert.equal(document.querySelector('[data-slot="gantt-drag-overlay"]'), null)
})

test('Gantt default canDrop remains advisory unless enforceCanDrop is enabled', async () => {
  const view = await mount({ defaultEvents: [sample()], canDropEvent: () => false }, true)
  await resizeEnd(view)
  assert.equal(view.calendar.getState().drag.valid, false)
  await pointer(window, 'pointerup', 660, 60)
  assert.equal(view.calendar.api.getEvent('sample').end.getUTCHours(), 11)
})
