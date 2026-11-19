import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { checkApplicationBoundaries } from '../scripts/check-application-boundaries.mjs'

function fixture(t, files) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'module-contracts-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const [file, source] of Object.entries(files)) {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, source)
  }
  return root
}

test('View internals are private to aliases, relative paths, dynamic imports and import types', t => {
  const root = fixture(t, {
    'src/modules/shop/orders/views/components/Order.tsx': 'export const Order = 1',
    'src/modules/shop/orders/views/data/row.ts': 'export interface Row { id: number }',
    'src/components/business/report/index.ts': `
      import { Order } from '~/shop/orders/views/components/Order'
      export type ReportRow = import('@/modules/shop/orders/views/data/row').Row
      export const load = () => import('@/modules/shop/orders/views/components/Order')
      export const loadTemplate = () => import(\`@/modules/shop/orders/views/components/Order\`)
    `,
    'src/modules/sales/report/views/index.tsx': "import type { Row } from '../../../shop/orders/views/data/row'",
  })
  const result = checkApplicationBoundaries(root)
  assert.equal(result.failures.length, 5, result.failures.join('\n'))
  assert.ok(result.failures.every(failure => failure.includes("import the feature's public entry")))
})

test('Explicit public entries support cross-module components and types while local internals remain accessible', t => {
  const root = fixture(t, {
    'src/modules/shop/orders/index.ts': `
      export { Order } from './views/components/Order'
      export type { Row } from './views/data/row'
    `,
    'src/modules/shop/orders/views/components/Order.tsx':
      "import type { Row } from '../data/row'; export const Order = 1",
    'src/modules/shop/orders/views/data/row.ts': 'export interface Row { id: number }',
    'src/modules/sales/report/views/index.tsx': "import { Order, type Row } from '~/shop/orders'",
  })
  assert.deepEqual(checkApplicationBoundaries(root).failures, [])
})

test('A public export needs a consumer outside its own sub-module', t => {
  const root = fixture(t, {
    'src/modules/shop/orders/index.ts': "export { used, unused } from './api/orders'",
    'src/modules/shop/orders/api/orders.ts': 'export const used = 1, unused = 2',
    'src/modules/shop/orders/views/index.tsx': "import { unused } from '..'",
    'src/modules/sales/report/views/index.tsx': "import { used } from '@/modules/shop/orders'",
  })
  assert.deepEqual(checkApplicationBoundaries(root).failures, [
    'src/modules/shop/orders/index.ts: unused has no consumer outside its sub-module; remove it from the public entry',
  ])
})

test('Dynamic public imports and qualified type consumers count as public contract consumers', t => {
  const root = fixture(t, {
    'src/modules/shop/orders/index.ts': "export { Order } from './api/orders'; export type { Row } from './api/orders'",
    'src/modules/shop/orders/api/orders.ts': 'export const Order = 1; export interface Row { id: number }',
    'src/components/business/report/index.ts': `
      export const load = () => import(\`@/modules/shop/orders\`)
      export type ReportRow = import('@/modules/shop/orders').Row
    `,
  })
  assert.deepEqual(checkApplicationBoundaries(root).failures, [])
})

test('Page entry composition and API contracts remain valid cross-module targets', t => {
  const root = fixture(t, {
    'src/modules/shop/orders/views/index.tsx': 'export default function Orders() { return null }',
    'src/modules/shop/orders/api/orders.ts': 'export interface Row { id: number }',
    'src/modules/sales/report/views/index.tsx': `
      import Orders from '~/shop/orders/views'
      import type { Row } from '@/modules/shop/orders/api/orders'
    `,
  })
  assert.deepEqual(checkApplicationBoundaries(root).failures, [])
})

test('Unresolved dynamic module aliases are reported', t => {
  const root = fixture(t, {
    'src/modules/shop/orders/views/index.tsx': "export const load = () => import('~/missing/page')",
  })
  assert.deepEqual(checkApplicationBoundaries(root).failures, [
    'src/modules/shop/orders/views/index.tsx: unresolved ~/missing/page',
  ])
})

test('Plugin public exports are not subject to business sub-module consumer requirements', t => {
  const root = fixture(t, {
    'src/plugins/example/toolbar/index.ts': "export { Toolbar } from './components/toolbar'",
    'src/plugins/example/toolbar/components/toolbar.tsx': 'export const Toolbar = 1',
  })
  assert.deepEqual(checkApplicationBoundaries(root).failures, [])
})
