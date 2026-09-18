import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const result = await build({
  stdin: {
    contents:
      "export * from './src/modules/base/dashboard/dashboard-slot'; export { DashboardSlotOutlet } from './src/modules/base/dashboard/dashboard-slot-outlet'",
    resolveDir: process.cwd(),
    sourcefile: 'dashboard-slot-entry.ts',
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const registry = module.exports

test('Dashboard Slot：按插槽和顺序渲染，并支持独立撤销', () => {
  const events = []
  const unsubscribe = registry.subscribeDashboardSlots(() => events.push(registry.getDashboardSlotsSnapshot()))
  const disposeLate = registry.registerDashboardSlot({
    id: 'test-late',
    order: 20,
    render: () => 'late',
  })
  const disposeEarly = registry.registerDashboardSlot({
    id: 'test-early',
    order: 10,
    render: () => 'early',
  })
  registry.registerDashboardSlot({
    id: 'test-header',
    slot: 'header',
    render: () => 'header',
  })

  assert.deepEqual(
    registry.getDashboardSlots('main').map(item => item.id),
    ['test-early', 'test-late'],
  )
  assert.deepEqual(
    registry.getDashboardSlots('header').map(item => item.id),
    ['test-header'],
  )
  assert.equal(events.length, 3)
  assert.equal(registry.getDashboardSlotsSnapshot(), registry.getDashboardSlotsSnapshot())

  disposeEarly()
  assert.deepEqual(
    registry.getDashboardSlots('main').map(item => item.id),
    ['test-late'],
  )
  disposeEarly()
  disposeLate()
  registry.registerDashboardSlot({ id: 'test-header', slot: 'header', render: () => 'replacement' })()
  unsubscribe()
  assert.equal(registry.getDashboardSlotsSnapshot().length, 0)
})

test('Dashboard Slot：重复 ID 替换旧注册，旧 disposer 不会误删新注册', () => {
  const disposeOld = registry.registerDashboardSlot({ id: 'test-replace', render: () => 'old' })
  const disposeNew = registry.registerDashboardSlot({ id: 'test-replace', render: () => 'new' })

  disposeOld()
  assert.equal(registry.getDashboardSlots('main')[0].render(), 'new')
  disposeNew()
  assert.equal(registry.getDashboardSlots('main').length, 0)
})

test('Dashboard Slot Outlet：只渲染当前插槽的注册内容', () => {
  const disposeMain = registry.registerDashboardSlot({
    id: 'test-render-main',
    render: () => createElement('span', { 'data-slot': 'main' }, '业务内容'),
  })
  const disposeFooter = registry.registerDashboardSlot({
    id: 'test-render-footer',
    slot: 'footer',
    render: () => createElement('span', { 'data-slot': 'footer' }, '页脚内容'),
  })

  assert.equal(
    renderToStaticMarkup(createElement(registry.DashboardSlotOutlet, { slot: 'main' })),
    '<span data-slot="main">业务内容</span>',
  )
  disposeMain()
  disposeFooter()
  assert.equal(renderToStaticMarkup(createElement(registry.DashboardSlotOutlet, { slot: 'main' })), '')
})

test('Dashboard Slot：拒绝空 ID 和非法渲染器', () => {
  assert.throws(() => registry.registerDashboardSlot({ id: '  ', render: () => null }), /non-empty id/)
  assert.throws(() => registry.registerDashboardSlot({ id: 'test-invalid', render: null }), /render function/)
  assert.throws(
    () => registry.registerDashboardSlot({ id: 'test-invalid-slot', slot: 'unknown', render: () => null }),
    /unsupported slot/,
  )
})
