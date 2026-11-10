import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const require = createRequire(new URL('../package.json', import.meta.url))
const { build } = require('esbuild')
const { addDays } = require('date-fns')
const { TZDate } = require('@date-fns/tz')
const built = await build({
  stdin: {
    contents: `export { expandRecurrence as calendar } from './src/components/reui/event-calendar/event-calendar-recurrence'; export { expandRecurrence as gantt } from './src/components/reui/gantt/gantt-recurrence'`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
})
const module = { exports: {} }
new Function('module', 'exports', 'require', built.outputFiles[0].text)(module, module.exports, require)
const date = value => new Date(value)
const range = (start, end) => ({ start: date(start), end: date(end) })
const event = (start, end, recurrence, allDay = false) => ({
  id: 'series',
  title: 'Synthetic recurrence',
  start: date(start),
  end: date(end),
  recurrence,
  allDay,
})

for (const [name, expand] of Object.entries(module.exports)) {
  test(`${name}: skipped monthly and yearly dates preserve ordinal in a narrow window`, () => {
    const monthly = event('2026-01-31T09:00:00Z', '2026-01-31T10:00:00Z', 'FREQ=MONTHLY;COUNT=3')
    const narrowed = expand(monthly, range('2026-05-01', '2026-06-01'), { timeZone: 'UTC' })
    assert.deepEqual(
      narrowed.map(o => [o.start.toISOString(), o.recurrenceIndex]),
      [['2026-05-31T09:00:00.000Z', 2]],
    )
    assert.equal(expand(monthly, range('2026-06-01', '2027-01-01'), { timeZone: 'UTC' }).length, 0)
    const leap = event('2024-02-29T09:00:00Z', '2024-02-29T10:00:00Z', 'FREQ=YEARLY;COUNT=3')
    const all = expand(leap, range('2024-01-01', '2034-01-01'), { timeZone: 'UTC' })
    assert.deepEqual(
      all.map(o => o.start.getUTCFullYear()),
      [2024, 2028, 2032],
    )
    const later = expand(leap, range('2028-01-01', '2030-01-01'), { timeZone: 'UTC' })
    assert.deepEqual(
      later.map(o => o.recurrenceIndex),
      [1],
    )
  })

  test(`${name}: point RDATEs include the start, exclude the end and deduplicate`, () => {
    const rule = {
      freq: 'daily',
      count: 1,
      rDates: [date('2026-09-01'), date('2026-09-02'), date('2026-09-02'), date('2026-09-03')],
    }
    const occurrences = expand(event('2026-08-30', '2026-08-30', rule), range('2026-09-01', '2026-09-03'), {
      timeZone: 'UTC',
    })
    assert.deepEqual(
      occurrences.map(o => o.start.toISOString()),
      ['2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z'],
    )
  })

  test(`${name}: WKST, COUNT and UNTIL remain consistent after fast-forward`, () => {
    for (const wkst of ['MO', 'SU']) {
      const series = event(
        '2026-09-01T09:00:00Z',
        '2026-09-01T10:00:00Z',
        `FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,SU;COUNT=8;WKST=${wkst}`,
      )
      const all = expand(series, range('2026-09-01', '2026-12-01'), { timeZone: 'UTC' })
      const later = expand(series, range('2026-09-15', '2026-12-01'), { timeZone: 'UTC' })
      assert.deepEqual(
        later.map(o => [o.start.getTime(), o.recurrenceIndex]),
        all.filter(o => o.start >= date('2026-09-15')).map(o => [o.start.getTime(), o.recurrenceIndex]),
      )
    }
    const series = event(
      '2026-09-01T09:00:00Z',
      '2026-09-01T10:00:00Z',
      'FREQ=WEEKLY;BYDAY=MO,TU;WKST=MO;UNTIL=20260907T235959Z',
    )
    assert.deepEqual(
      expand(series, range('2026-09-07', '2026-09-10'), { timeZone: 'UTC' }).map(o => o.start.toISOString()),
      ['2026-09-07T09:00:00.000Z'],
    )
  })

  test(`${name}: old daily series reach the requested range without exhausting the cap`, () => {
    const series = event('1990-01-01T09:00:00Z', '1990-01-01T10:00:00Z', 'FREQ=DAILY')
    const actual = expand(series, range('2026-09-01', '2026-09-04'), { timeZone: 'UTC' })
    assert.deepEqual(
      actual.map(o => o.start.toISOString().slice(0, 10)),
      ['2026-09-01', '2026-09-02', '2026-09-03'],
    )
  })

  for (const start of ['2026-03-07T00:00:00-05:00', '2026-10-31T00:00:00-04:00']) {
    for (const span of [1, 3]) {
      test(`${name}: ${span}-day all-day recurrence keeps local midnights from ${start}`, () => {
        const timeZone = 'America/New_York'
        const first = new TZDate(date(start).getTime(), timeZone)
        const extra = addDays(first, 5)
        const series = event(start, addDays(first, span), { freq: 'daily', count: 3, rDates: [extra] }, true)
        const actual = expand(series, { start: new Date(first), end: new Date(addDays(first, 10)) }, { timeZone })
        assert.equal(actual.length, 4)
        for (const occurrence of actual) {
          const zoned = new TZDate(occurrence.start.getTime(), timeZone)
          assert.equal(occurrence.end.getTime(), addDays(zoned, span).getTime())
          assert.equal(new TZDate(occurrence.end.getTime(), timeZone).getHours(), 0)
        }
      })
    }
  }

  test(`${name}: timed duration and excluded COUNT slots retain their contracts`, () => {
    const timeZone = 'America/New_York'
    const series = event('2026-03-07T01:00:00-05:00', '2026-03-07T03:00:00-05:00', {
      freq: 'daily',
      count: 3,
      exDates: [date('2026-03-07T01:00:00-05:00')],
    })
    const actual = expand(series, range('2026-03-07T00:00:00-05:00', '2026-03-12T00:00:00-04:00'), { timeZone })
    assert.deepEqual(
      actual.map(o => o.recurrenceIndex),
      [1, 2],
    )
    assert.ok(actual.every(o => o.end - o.start === 2 * 3600000))
  })
}

test('Calendar explicit month-end rule and Gantt unsupported filters keep their distinct contracts', () => {
  const series = event('2026-01-31T09:00:00Z', '2026-01-31T10:00:00Z', 'FREQ=MONTHLY;COUNT=3;BYMONTHDAY=-1')
  assert.deepEqual(
    module.exports
      .calendar(series, range('2026-01-01', '2026-06-01'), { timeZone: 'UTC' })
      .map(o => o.start.toISOString().slice(0, 10)),
    ['2026-01-31', '2026-02-28', '2026-03-31'],
  )
  for (const rule of ['FREQ=MONTHLY;BYMONTHDAY=-1', 'FREQ=YEARLY;BYMONTH=2', 'FREQ=DAILY;BYDAY=MO']) {
    assert.throws(
      () =>
        module.exports.gantt({ ...series, recurrence: rule }, range('2026-01-01', '2026-06-01'), { timeZone: 'UTC' }),
      /Unsupported recurrence part/,
    )
  }
})

for (const [name, expand] of Object.entries(module.exports)) {
  test(`${name}: invalid dates and overflowing intervals cannot trap fast-forward`, () => {
    const series = event('2026-01-01T09:00:00Z', '2026-01-01T10:00:00Z', 'FREQ=DAILY')
    assert.deepEqual(expand(series, { start: new Date(NaN), end: date('2026-01-03') }, { timeZone: 'UTC' }), [])
    assert.deepEqual(
      expand({ ...series, end: new Date(NaN) }, range('2026-01-01', '2026-01-03'), { timeZone: 'UTC' }),
      [],
    )
    const sparse = { ...series, recurrence: { freq: 'yearly', interval: 1000000 } }
    assert.deepEqual(expand(sparse, range('2027-01-01', '2028-01-01'), { timeZone: 'UTC' }), [])
  })
}
