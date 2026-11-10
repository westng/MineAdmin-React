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
      "export * from './src/components/reui/event-calendar/event-calendar'; export * from './src/components/reui/event-calendar/event-calendar-content'; export * from './src/components/reui/event-calendar/event-calendar-dnd'; export * from './src/components/reui/event-calendar/event-calendar-lib'; export * from './src/components/reui/event-calendar/event-calendar-recurrence'",
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
    ui.cancelActiveEventCalendarGestures()
    roots.splice(0).forEach(root => root.unmount())
  })
  document.body.replaceChildren()
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})
const settle = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 20))
  })
const date = value => new Date(value)
const anchor = date('2026-09-01T00:00:00Z')
const sample = () => ({
  id: 'sample',
  title: 'Synthetic review event',
  start: date('2026-09-01T09:00:00Z'),
  end: date('2026-09-01T10:00:00Z'),
})
async function mount(configs) {
  const view = { instances: new Map(), container: document.createElement('div') }
  document.body.append(view.container)
  const root = createRoot(view.container)
  roots.push(root)
  function Probe({ id }) {
    view.instances.set(id, ui.useEventCalendar())
    return null
  }
  function Fixture() {
    const [hidden, setHidden] = React.useState([])
    view.hide = async id => act(async () => setHidden(old => [...old, id]))
    return h(
      React.Fragment,
      null,
      configs
        .filter(config => !hidden.includes(config.id))
        .map(config =>
          h(
            ui.EventCalendar,
            {
              key: config.id,
              'data-test-calendar': config.id,
              timeZone: 'UTC',
              defaultView: 'day',
              defaultDate: anchor,
              scrollMode: 'page',
              nowIndicator: false,
              enableShortcuts: false,
              ...config.options,
            },
            h(Probe, { id: config.id }),
            h(ui.EventCalendarContent),
          ),
        ),
    )
  }
  await act(async () => root.render(h(Fixture)))
  await settle()
  return view
}
function setRect(element, x, y, width, height) {
  element.getBoundingClientRect = () => new DOMRect(x, y, width, height)
}
async function pointer(target, type, x, y, pointerId = 1) {
  await act(async () =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        pointerType: 'mouse',
        pointerId,
        clientX: x,
        clientY: y,
      }),
    ),
  )
}
async function resizeEnd(view, id = 'a') {
  const root = view.container.querySelector(`[data-test-calendar="${id}"]`)
  setRect(root.querySelector('[data-slot="event-calendar-day-column"]'), 0, 0, 100, 1440)
  const handle = root.querySelector('[data-slot="event-calendar-event"] [data-edge="end"]')
  assert.ok(handle)
  await pointer(handle, 'pointerdown', 50, 600)
  await pointer(window, 'pointermove', 50, 660)
}

test('Calendar canDropEvent rejects the final resize without writing', async () => {
  const view = await mount([{ id: 'a', options: { defaultEvents: [sample()], canDropEvent: () => false } }])
  const calendar = view.instances.get('a')
  await resizeEnd(view)
  assert.equal(calendar.getState().drag.valid, false)
  await pointer(window, 'pointerup', 50, 660)
  assert.equal(calendar.api.getEvent('sample').end.getTime(), date('2026-09-01T10:00:00.000Z').getTime())
})

test('Calendar unmount cancels only its own gesture while another instance remains', async () => {
  const writes = []
  const view = await mount([
    { id: 'a', options: { defaultEvents: [sample()], onEventsChange: events => writes.push(events) } },
    { id: 'b', options: { defaultEvents: [sample()] } },
  ])
  const calendar = view.instances.get('a')
  await resizeEnd(view)
  assert.ok(calendar.getState().drag)
  await view.hide('a')
  assert.equal(view.container.querySelector('[data-test-calendar="a"]'), null)
  assert.ok(view.container.querySelector('[data-test-calendar="b"]'))
  assert.equal(calendar.getState().drag, null)
  await pointer(window, 'pointerup', 50, 660)
  assert.equal(writes.length, 0)
  await resizeEnd(view, 'b')
  await pointer(window, 'pointerup', 50, 660)
  assert.equal(view.instances.get('b').api.getEvent('sample').end.getUTCHours(), 11)
})

for (const mode of ['day', 'resource']) {
  test(`Calendar ${mode} view includes the final hour on a DST fallback day`, async () => {
    const early = {
      id: 'early',
      title: 'Early synthetic event',
      start: date('2026-11-01T22:30:00-05:00'),
      end: date('2026-11-01T22:45:00-05:00'),
      resourceId: 'room',
    }
    const late = {
      id: 'late',
      title: 'Late synthetic event',
      start: date('2026-11-01T23:30:00-05:00'),
      end: date('2026-11-01T23:45:00-05:00'),
      resourceId: 'room',
    }
    const view = await mount([
      {
        id: 'a',
        options: {
          timeZone: 'America/New_York',
          defaultView: mode,
          defaultDate: date('2026-11-01T12:00:00-05:00'),
          resources: [{ id: 'room', title: 'Synthetic room' }],
          defaultEvents: [early, late],
        },
      },
    ])
    const calendar = view.instances.get('a')
    assert.equal(calendar.api.getOccurrences().length, 2)
    assert.equal(ui.getDayTotalMinutes(ui.zonedStartOfDay(late.start, 'America/New_York'), 'America/New_York'), 1500)
    const column = view.container.querySelector('[data-slot="event-calendar-day-column"]')
    assert.equal(column.getAttribute('data-ec-bounds-end'), '1500')
    assert.match(column.textContent, /Early synthetic event/)
    assert.match(column.textContent, /Late synthetic event/)
  })
}

test('Recurring zero-length events include the range start and exclude its end', () => {
  const event = { id: 'point', title: 'Synthetic point', start: anchor, end: anchor, recurrence: 'FREQ=DAILY;COUNT=3' }
  const range = { start: anchor, end: date('2026-09-03T00:00:00Z') }
  assert.deepEqual(
    ui.expandRecurrence(event, range, { timeZone: 'UTC' }).map(occ => occ.start.toISOString()),
    ['2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z'],
  )
  assert.equal(ui.expandRecurrence({ ...event, recurrence: undefined }, range, { timeZone: 'UTC' }).length, 1)
})

test('Monthly RRULE skips invalid days without consuming COUNT', () => {
  const event = {
    id: 'monthly',
    title: 'Synthetic monthly',
    start: date('2026-01-31T09:00:00Z'),
    end: date('2026-01-31T10:00:00Z'),
    recurrence: 'FREQ=MONTHLY;COUNT=3',
  }
  const occurrences = ui.expandRecurrence(
    event,
    { start: date('2026-01-01T00:00:00Z'), end: date('2026-06-01T00:00:00Z') },
    { timeZone: 'UTC' },
  )
  assert.deepEqual(
    occurrences.map(occ => occ.start.toISOString().slice(0, 10)),
    ['2026-01-31', '2026-03-31', '2026-05-31'],
  )
})

test('Resizing a later recurrence preserves the series start and earlier instances', async () => {
  const view = await mount([
    {
      id: 'a',
      options: {
        defaultDate: date('2026-09-15T00:00:00Z'),
        defaultEvents: [{ ...sample(), recurrence: 'FREQ=WEEKLY;COUNT=4' }],
      },
    },
  ])
  const calendar = view.instances.get('a')
  const range = { start: anchor, end: date('2026-10-01T00:00:00Z') }
  assert.equal(calendar.api.getOccurrences(range).length, 4)
  await resizeEnd(view)
  await pointer(window, 'pointerup', 50, 660)
  assert.equal(calendar.api.getEvent('sample').start.toISOString(), '2026-09-01T09:00:00.000Z')
  assert.equal(calendar.api.getEvent('sample').end.toISOString(), '2026-09-01T11:00:00.000Z')
  assert.equal(
    calendar.api.getOccurrences(range).some(occ => occ.start < date('2026-09-15T00:00:00Z')),
    true,
  )
})

test('Resource all-day drag selection preserves the starting resource', async () => {
  const selected = []
  const view = await mount([
    {
      id: 'a',
      options: {
        defaultView: 'resource',
        resources: [{ id: 'room', title: 'Synthetic room' }],
        onSelectSlot: slot => selected.push(slot),
      },
    },
  ])
  const root = view.container.querySelector('[data-test-calendar="a"]')
  const cell = root.querySelector('[data-slot="event-calendar-all-day-cell"]')
  setRect(cell, 0, 0, 100, 40)
  setRect(root.querySelector('[data-slot="event-calendar-day-column"]'), 0, 50, 100, 1440)
  await pointer(cell, 'pointerdown', 50, 20)
  await pointer(window, 'pointermove', 56, 20)
  await pointer(window, 'pointerup', 56, 20)
  assert.equal(selected.length, 1)
  assert.equal(selected[0].allDay, true)
  assert.equal(selected[0].view, 'resource')
  assert.equal(selected[0].resourceId, 'room')
})

test('Calendar onMoreClick false cancels the built-in popover', async () => {
  let calls = 0
  const view = await mount([
    {
      id: 'a',
      options: {
        defaultView: 'month',
        defaultEvents: [sample(), { ...sample(), id: 'second', title: 'Second synthetic event' }],
        maxEventsPerCell: 1,
        onMoreClick: () => {
          calls++
          return false
        },
      },
    },
  ])
  const more = view.container.querySelector('[data-slot="event-calendar-more"]')
  assert.ok(more)
  await act(async () => more.click())
  await settle()
  assert.equal(calls, 1)
  assert.equal(document.querySelector('[data-slot="event-calendar-more-popover"]'), null)
})

for (const mode of ['day', 'resource']) {
  for (const [localDay, timeZone, offset, total, startAtEight] of [
    ['2026-11-01', 'America/New_York', '-05:00', 1500, 540],
    ['2026-03-08', 'America/New_York', '-04:00', 1380, 420],
    ['2026-09-01', 'America/New_York', '-04:00', 1440, 480],
    ['2026-11-01', 'Asia/Shanghai', '+08:00', 1440, 480],
  ]) {
    test(`Calendar ${mode} ${localDay} ${timeZone} uses one scale for bounds, gutter and pointer selection`, async () => {
      const slots = []
      const labels = []
      const view = await mount([
        {
          id: 'a',
          options: {
            timeZone,
            defaultView: mode,
            defaultDate: date(`${localDay}T12:00:00${offset}`),
            dayStartHour: 8,
            dayEndHour: 24,
            resources: [{ id: 'room', title: 'Synthetic room' }],
            defaultEvents: [
              {
                id: 'late',
                title: 'Late event',
                resourceId: 'room',
                start: date(`${localDay}T23:30:00${offset}`),
                end: date(`${localDay}T23:45:00${offset}`),
              },
            ],
            onSelectSlot: slot => slots.push(slot),
            renderTimeGutterSlot: slot => {
              labels.push(slot)
              return String(slot.hour)
            },
          },
        },
      ])
      const column = view.container.querySelector('[data-slot="event-calendar-day-column"]')
      assert.equal(column.getAttribute('data-ec-bounds-start'), String(startAtEight))
      assert.equal(column.getAttribute('data-ec-bounds-end'), String(total))
      assert.match(column.textContent, /Late event/)
      const eventNode = column.querySelector('[data-slot="event-calendar-event"]')
      assert.equal(eventNode.parentElement.style.top, 'calc(var(--ec-hour-height) * 15.5)')
      assert.equal(labels[0].hour, 8)
      assert.equal(labels.at(-1).hour, 23)
      for (const label of labels) assert.equal(label.hour, ui.toZoned(label.time, timeZone).getHours())
      setRect(column, 0, 0, 100, total - startAtEight)
      await pointer(column, 'pointerdown', 50, 930)
      await pointer(window, 'pointermove', 56, 945)
      await pointer(window, 'pointerup', 56, 945)
      assert.equal(slots.length, 1)
      assert.equal(slots[0].start.getTime(), date(`${localDay}T23:30:00${offset}`).getTime())
      assert.equal(slots[0].end.getTime(), date(`${localDay}T23:45:00${offset}`).getTime())
      if (mode === 'resource') assert.equal(slots[0].resourceId, 'room')
    })
  }
}

test('Calendar revalidates a stationary final resize and clears rejected slot drafts', async () => {
  let allow = true
  const writes = []
  const selected = []
  const view = await mount([
    {
      id: 'a',
      options: {
        defaultEvents: [sample()],
        canDropEvent: () => allow,
        canSelectSlot: () => allow,
        onEventsChange: value => writes.push(value),
        onSelectSlot: slot => selected.push(slot),
      },
    },
  ])
  await resizeEnd(view)
  assert.equal(view.instances.get('a').getState().drag.valid, true)
  allow = false
  await pointer(window, 'pointerup', 50, 660)
  assert.equal(writes.length, 0)
  const column = view.container.querySelector('[data-slot="event-calendar-day-column"]')
  allow = true
  await pointer(column, 'pointerdown', 50, 720)
  await pointer(window, 'pointermove', 50, 735)
  assert.ok(view.instances.get('a').getState().slotDraft)
  allow = false
  await pointer(window, 'pointerup', 50, 735)
  assert.equal(view.instances.get('a').getState().slotDraft, null)
  assert.equal(selected.length, 0)
})

for (const allow of [false, true])
  test(`Calendar move commits ${allow ? 'once when accepted' : 'nothing when rejected'}`, async () => {
    const writes = []
    const view = await mount([
      {
        id: 'a',
        options: {
          defaultEvents: [sample()],
          canDropEvent: () => allow,
          onEventsChange: events => writes.push(events),
        },
      },
    ])
    const column = view.container.querySelector('[data-slot="event-calendar-day-column"]')
    setRect(column, 0, 0, 100, 1440)
    const chip = column.querySelector('[data-slot="event-calendar-event"]')
    setRect(chip, 0, 540, 100, 60)
    await pointer(chip, 'pointerdown', 50, 555)
    await pointer(window, 'pointermove', 50, 615)
    assert.equal(view.instances.get('a').getState().drag.valid, allow)
    await pointer(window, 'pointerup', 50, 615)
    assert.equal(writes.length, allow ? 1 : 0)
    assert.equal(view.instances.get('a').api.getEvent('sample').start.getUTCHours(), allow ? 10 : 9)
  })

test('Calendar more popover still opens by default', async () => {
  const view = await mount([
    {
      id: 'a',
      options: { defaultView: 'month', defaultEvents: [sample(), { ...sample(), id: 'second' }], maxEventsPerCell: 1 },
    },
  ])
  await act(async () => view.container.querySelector('[data-slot="event-calendar-more"]').click())
  await settle()
  assert.ok(document.querySelector('[data-slot="event-calendar-more-popover"]'))
})

test('Calendar series start resize remaps selection to the occurrence, not DTSTART', async () => {
  const view = await mount([
    {
      id: 'a',
      options: { defaultDate: date('2026-09-15'), defaultEvents: [{ ...sample(), recurrence: 'FREQ=WEEKLY;COUNT=4' }] },
    },
  ])
  const calendar = view.instances.get('a')
  const occurrence = calendar.api.getOccurrences()[0]
  await act(async () => {
    calendar.api.selectEvent(occurrence.key)
    calendar.internals.applyProposedUpdate({
      event: occurrence.event,
      occurrence,
      start: date('2026-09-15T09:15:00Z'),
      end: occurrence.end,
      allDay: false,
      source: 'resize-start',
    })
  })
  assert.equal(calendar.api.getEvent('sample').start.toISOString(), '2026-09-01T09:15:00.000Z')
  assert.deepEqual(calendar.getState().selection.eventKeys, ['sample::2026-09-15T09:15:00.000Z'])
})
