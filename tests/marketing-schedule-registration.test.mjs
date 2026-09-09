import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import process from 'node:process'
import { build } from 'esbuild'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

process.env.TZ = 'Asia/Shanghai'
const result = await build({
  stdin: {
    contents: `export * from './src/modules/marketing/schedule/config/appearance'; export * from './src/modules/marketing/schedule/utils/schedule-calendar'; export * from './src/modules/marketing/schedule/utils/schedule-form'; export * from './src/modules/marketing/schedule/utils/schedule-phase-timeline'; export { buildEventIndex } from './src/components/reui/event-calendar/event-calendar-lib'; export { SchedulePhaseTimeline } from './src/modules/marketing/schedule/components/SchedulePhaseTimeline'; export { registrationStatusLabel } from './src/modules/marketing/schedule/utils/schedule-presentation'; export { operationChanges } from './src/modules/marketing/schedule/utils/operation-log-presentation'; export { ScheduleRegistrationBadge } from './src/modules/marketing/schedule/components/ScheduleRegistrationBadge'; export { emptyForm, fallbackScheduleDictionaries } from './src/modules/marketing/schedule/views/data'; export { filterSchedulesByCreator } from './src/modules/marketing/schedule/store/use-creator-filter-store'`,
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['zustand', 'react'],
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, createRequire(import.meta.url))
const { scheduleToEvents, getSchedulePeriods, scheduleWithUpdatedCalendarRange, scheduleSegmentRange, scheduleTimelineSlices, buildEventIndex, SchedulePhaseTimeline, validateScheduleTimes, scheduleToForm, scheduleFormPayload, registrationStatusLabel, operationChanges, ScheduleRegistrationBadge, emptyForm, fallbackScheduleDictionaries, filterSchedulesByCreator } = module.exports

const schedule = {
  id: 42, marketing_name: '秋季活动', platform_channel: 'douyin', business_type: 'official_activity',
  schedule_status: 'planned', created_by: 10, can_update: true,
  registration_start_at: '2026-08-25T00:00:00', registration_end_at: '2026-08-30T23:59:59',
  campaign_start_at: '2026-09-08T00:00:00', campaign_end_at: '2026-09-15T23:59:59',
}

test('one official record yields one calendar event spanning both phases', () => {
  const events = scheduleToEvents(schedule)
  assert.equal(events.length, 1)
  assert.equal(events[0].id, '42')
  assert.equal(events[0].title, schedule.marketing_name)
  assert.equal(events[0].start.getTime(), new Date(schedule.registration_start_at).getTime())
  assert.equal(events[0].end.getTime(), new Date(schedule.campaign_end_at).getTime())
  assert.equal(events[0].data, schedule)
  assert.equal(events[0].draggable, true)
  assert.equal(events[0].resizable, false)
})

test('other business types remain a single event even if stale registration values are present', () => {
  for (const business_type of ['seeding', 'marketing_node', 'affiliate_live', 'affiliate_short_video']) {
    const events = scheduleToEvents({ ...schedule, business_type, can_update: false })
    assert.equal(events.length, 1)
    assert.equal(events[0].title, schedule.marketing_name)
    assert.equal(events[0].draggable, false)
    assert.equal(events[0].resizable, false)
  }
})

test('legacy or incomplete registration is not fabricated on the calendar', () => {
  for (const registration_end_at of [null, '', 'invalid', '2026-08-20T00:00:00']) {
    const events = scheduleToEvents({ ...schedule, registration_end_at })
    assert.equal(events.length, 1)
    assert.equal(events[0].id, '42')
    assert.equal(events[0].start.getTime(), new Date(schedule.campaign_start_at).getTime())
  }
})

test('phase ranges span separate months and leave the gap empty', () => {
  const periods = getSchedulePeriods(schedule)
  const occurs = time => periods.some(period => period.start <= new Date(time) && period.end >= new Date(time))
  assert.equal(occurs('2026-08-27T12:00:00'), true)
  assert.equal(occurs('2026-09-02T12:00:00'), false)
  assert.equal(occurs('2026-09-10T12:00:00'), true)
})

test('dragging the combined event moves all four times by the same offset', () => {
  const moved = scheduleWithUpdatedCalendarRange(schedule, new Date('2026-08-26T00:00:00'), new Date('2026-09-16T23:59:59'))
  assert.equal(moved.id, 42)
  for (const field of ['registration_start_at', 'registration_end_at', 'campaign_start_at', 'campaign_end_at']) {
    assert.equal(new Date(moved[field]).getTime() - new Date(schedule[field]).getTime(), 86400000)
  }
  assert.equal(schedule.registration_start_at, '2026-08-25T00:00:00')
  assert.equal(scheduleWithUpdatedCalendarRange(schedule, new Date('2026-08-26T00:00:00'), new Date('2026-09-15T23:59:59')), null)
  const legacy = { ...schedule, registration_start_at: null, registration_end_at: null }
  const movedLegacy = scheduleWithUpdatedCalendarRange(legacy, new Date('2026-09-09T00:00:00'), new Date('2026-09-16T23:59:59'))
  assert.equal(movedLegacy.registration_start_at, null)
  assert.equal(movedLegacy.registration_end_at, null)
})

test('other business types can still move and resize their activity range', () => {
  const record = { ...schedule, business_type: 'marketing_node', registration_start_at: null, registration_end_at: null }
  assert.equal(scheduleToEvents(record)[0].resizable, true)
  const resized = scheduleWithUpdatedCalendarRange(record, new Date('2026-09-08T00:00:00'), new Date('2026-09-20T23:59:59'))
  assert.equal(resized.campaign_start_at, record.campaign_start_at)
  assert.equal(resized.campaign_end_at, '2026-09-20T23:59:59')
  assert.equal(resized.registration_start_at, null)
})

test('form and drag validation reject missing, invalid, or reversed phase times', () => {
  assert.equal(validateScheduleTimes(schedule), null)
  for (const patch of [
    { registration_start_at: null }, { registration_end_at: null },
    { registration_end_at: 'invalid' }, { registration_end_at: '2026-08-24T00:00:00' },
    { campaign_start_at: 'invalid' }, { campaign_end_at: '2026-09-07T00:00:00' },
  ]) assert.equal(typeof validateScheduleTimes({ ...schedule, ...patch }), 'string')
  assert.equal(validateScheduleTimes({ ...schedule, registration_end_at: schedule.registration_start_at, campaign_end_at: schedule.campaign_start_at }), null)
})

test('touching, overlapping, and coinciding phases remain a single editable event', () => {
  for (const patch of [
    { registration_end_at: schedule.campaign_start_at },
    { registration_end_at: '2026-09-10T00:00:00' },
    { registration_start_at: schedule.campaign_start_at, registration_end_at: schedule.campaign_end_at },
  ]) {
    const record = { ...schedule, ...patch }
    assert.equal(validateScheduleTimes(record), null)
    assert.equal(validateScheduleTimes(scheduleFormPayload(scheduleToForm(record), true)), null)
    assert.deepEqual(scheduleToEvents(record).map(event => event.id), ['42'])
  }
})

test('editing round-trips all four times; other types submit null registration values', () => {
  const form = scheduleToForm(schedule)
  const payload = scheduleFormPayload(form, true)
  for (const field of ['registration_start_at', 'registration_end_at', 'campaign_start_at', 'campaign_end_at']) {
    assert.equal(payload[field], schedule[field])
  }
  assert.equal(payload.schedule_status, undefined)
  const switched = scheduleFormPayload({ ...form, business_type: 'marketing_node' }, true)
  assert.equal(switched.registration_start_at, null)
  assert.equal(switched.registration_end_at, null)
  assert.equal(emptyForm().registration_start_at, '')
  assert.equal(emptyForm().registration_end_at, '')
})

test('creator filtering removes the combined event without double counting business records', () => {
  const records = [schedule]
  const visible = filterSchedulesByCreator(records, new Set())
  assert.equal(visible.length, 1)
  assert.equal(visible.flatMap(scheduleToEvents).length, 1)
  assert.equal(filterSchedulesByCreator(records, new Set(['10'])).flatMap(scheduleToEvents).length, 0)
})

test('manual confirmation round-trips independently of dates and activity status', () => {
  for (const registration_status of [null, 'unregistered', 'registered']) {
    const record = { ...schedule, registration_status, schedule_status: 'completed' }
    const form = scheduleToForm(record)
    assert.equal(form.registration_status, registration_status || 'unregistered')
    assert.equal(scheduleFormPayload(form, true).registration_status, registration_status || 'unregistered')
    const moved = scheduleWithUpdatedCalendarRange(record, new Date('2026-08-26T00:00:00'), new Date('2026-09-16T23:59:59'))
    assert.equal(moved.registration_status, registration_status)
    assert.equal(moved.schedule_status, 'completed')
    const switched = scheduleFormPayload({ ...form, business_type: 'seeding' }, true)
    assert.equal(switched.registration_status, null)
  }
  assert.equal(emptyForm().registration_status, 'unregistered')
  assert.equal(scheduleToForm(schedule).registration_status, 'unregistered')
})

test('registration has two business states and legacy empty values display as unregistered', () => {
  assert.equal(registrationStatusLabel(null), '未报名')
  assert.equal(registrationStatusLabel(undefined), '未报名')
  assert.equal(registrationStatusLabel(''), '未报名')
  assert.equal(registrationStatusLabel('unregistered'), '未报名')
  assert.equal(registrationStatusLabel('registered'), '已报名')
  assert.equal(registrationStatusLabel('unexpected'), '未知状态')
  assert.deepEqual(operationChanges({ changed_fields: { registration_status: { before: null, after: 'registered' } } }, fallbackScheduleDictionaries), [
    { field: 'registration_status', label: '报名状态', before: '未报名', after: '已报名' },
  ])
})

test('the combined official activity displays the manual registration badge', () => {
  for (const schedule_status of ['draft', 'planned', 'in_progress', 'completed', 'cancelled']) {
    for (const [registration_status, label] of [
      [null, '未报名'], [undefined, '未报名'], ['unregistered', '未报名'], ['registered', '已报名'], ['unexpected', '未知状态'],
    ]) {
      const record = { ...schedule, schedule_status, registration_status }
      for (const event of scheduleToEvents(record)) {
        const html = renderToStaticMarkup(createElement(ScheduleRegistrationBadge, { schedule: event.data }))
        assert.ok(html.includes(`aria-label="报名状态：${label}"`))
        assert.ok(html.includes(label))
        assert.equal(event.data.schedule_status, schedule_status)
      }
    }
  }
})

test('other business types do not display a registration badge', () => {
  for (const business_type of ['seeding', 'marketing_node', 'affiliate_live', 'affiliate_short_video']) {
    assert.equal(renderToStaticMarkup(createElement(ScheduleRegistrationBadge, { schedule: { ...schedule, business_type, registration_status: 'registered' } })), '')
  }
})

test('the month layout packs one lane per record even when registration and activity overlap', () => {
  const record = {
    ...schedule,
    registration_start_at: '2026-08-13T16:00:00', registration_end_at: '2026-09-25T23:59:00',
    campaign_start_at: '2026-08-20T00:00:00', campaign_end_at: '2026-09-25T23:59:59',
  }
  const index = buildEventIndex(scheduleToEvents(record), { start: new Date('2026-08-31T00:00:00'), end: new Date('2026-09-28T00:00:00') }, { timeZone: 'Asia/Shanghai', weekStartsOn: 1 })
  assert.equal(index.occurrences.length, 1)
  assert.equal(index.weekRows.length, 4)
  for (const row of index.weekRows) {
    assert.equal(row.bars.length, 1)
    assert.equal(row.bars[0].lane, 0)
    assert.equal(row.bars[0].occurrence.event.data.id, record.id)
  }
  const first = index.weekRows[0].bars[0]
  const range = scheduleSegmentRange(first)
  assert.equal(range.start.getTime(), new Date('2026-08-31T00:00:00').getTime())
  assert.equal(range.end.getTime(), new Date('2026-09-07T00:00:00').getTime())
  assert.deepEqual(scheduleTimelineSlices(record, range), [{ phase: 'overlap', left: 0, width: 100 }])
  const html = renderToStaticMarkup(createElement(SchedulePhaseTimeline, { schedule: record, segment: first }))
  assert.equal((html.match(/role="img"/g) || []).length, 1)
  assert.ok(html.includes('data-phase="overlap"'))
  assert.ok(html.includes('报名期 + 活动期'))
})

test('the single timeline distinguishes registration, overlap, activity, and gaps in date order', () => {
  const range = { start: new Date('2026-09-01T00:00:00'), end: new Date('2026-09-05T00:00:00') }
  const record = { ...schedule, registration_start_at: '2026-09-01T00:00:00', registration_end_at: '2026-09-03T00:00:00', campaign_start_at: '2026-09-02T00:00:00', campaign_end_at: '2026-09-05T00:00:00' }
  assert.deepEqual(scheduleTimelineSlices(record, range), [
    { phase: 'registration', left: 0, width: 25 }, { phase: 'overlap', left: 25, width: 25 }, { phase: 'campaign', left: 50, width: 50 },
  ])
  assert.deepEqual(scheduleTimelineSlices({ ...record, registration_end_at: '2026-09-02T00:00:00', campaign_start_at: '2026-09-04T00:00:00' }, range), [
    { phase: 'registration', left: 0, width: 25 }, { phase: 'gap', left: 25, width: 50 }, { phase: 'campaign', left: 75, width: 25 },
  ])
  assert.deepEqual(scheduleTimelineSlices(record, { start: new Date('2026-09-02T00:00:00'), end: new Date('2026-09-04T00:00:00') }), [
    { phase: 'overlap', left: 0, width: 50 }, { phase: 'campaign', left: 50, width: 50 },
  ])
  assert.deepEqual(scheduleTimelineSlices(schedule, { start: new Date('2026-09-01T00:00:00'), end: new Date('2026-09-07T00:00:00') }), [])
})

test('disjoint and identical phases both stay on a single lane', () => {
  for (const record of [schedule, { ...schedule, registration_start_at: schedule.campaign_start_at, registration_end_at: schedule.campaign_end_at }]) {
    const index = buildEventIndex(scheduleToEvents(record), { start: new Date('2026-08-24T00:00:00'), end: new Date('2026-09-21T00:00:00') }, { timeZone: 'Asia/Shanghai', weekStartsOn: 1 })
    assert.equal(index.occurrences.length, 1)
    assert.ok(index.weekRows.every(row => row.bars.length <= 1 && row.bars.every(bar => bar.lane === 0)))
  }
})

test('invalid or missing dates do not create phantom calendar events or invalid timeline widths', () => {
  assert.deepEqual(scheduleToEvents({ ...schedule, id: undefined }), [])
  assert.deepEqual(scheduleToEvents({ ...schedule, registration_start_at: null, campaign_start_at: 'invalid' }), [])
  const record = { ...schedule, registration_start_at: schedule.campaign_start_at, registration_end_at: schedule.campaign_start_at, campaign_end_at: schedule.campaign_start_at }
  const slices = scheduleTimelineSlices(record, { start: new Date('2026-09-08T00:00:00'), end: new Date('2026-09-09T00:00:00') })
  assert.equal(slices.length, 1)
  assert.equal(slices[0].phase, 'overlap')
  assert.ok(Number.isFinite(slices[0].width) && slices[0].width > 0)
  assert.equal(scheduleWithUpdatedCalendarRange(schedule, new Date('invalid'), new Date()), null)
})


test('status and phase text stays readable in both themes, including both overlap stripe colors', () => {
  const { scheduleStatusAppearance, scheduleRegistrationAppearance, schedulePhaseAppearance } = module.exports
  const luminance = hex => {
    const channels = hex.slice(1).match(/.{2}/g).map(channel => {
      const value = parseInt(channel, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }
  const assertReadable = (foreground, background) => {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
    const contrast = (values[0] + 0.05) / (values[1] + 0.05)
    assert.ok(contrast >= 4.5, `${foreground} on ${background}: ${contrast.toFixed(2)}:1`)
  }
  for (const theme of ['light', 'dark']) {
    for (const appearance of [...Object.values(scheduleStatusAppearance), ...Object.values(scheduleRegistrationAppearance), ...Object.values(schedulePhaseAppearance)]) {
      assertReadable(appearance[theme].foreground, appearance[theme].background)
    }
    for (const phase of ['registration', 'campaign']) {
      assertReadable(schedulePhaseAppearance.overlap[theme].foreground, schedulePhaseAppearance[phase][theme].background)
    }
  }
})
