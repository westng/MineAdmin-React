import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const checker = fileURLToPath(new URL('../scripts/check-module-structure.mjs', import.meta.url))

function check(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'mineadmin-base-structure-'))
  try {
    for (const [file, source] of Array.isArray(files)
      ? files.map(file => [file, 'export {}\n'])
      : Object.entries(files)) {
      const target = path.join(root, file)
      mkdirSync(path.dirname(target), { recursive: true })
      writeFileSync(target, source)
    }
    const result = spawnSync(process.execPath, [checker, root], { encoding: 'utf8' })
    assert.ifError(result.error)
    return { status: result.status, output: result.stdout + result.stderr }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const moduleFiles = name => [`${name}/api/index.ts`, `${name}/locales/index.ts`, `${name}/views/index.tsx`]

test('Base pages are direct sub-modules with their own API, locales and views', () => {
  const result = check([
    ...moduleFiles('base/user'),
    ...moduleFiles('base/dashboard'),
    ...moduleFiles('sales/orders'),
    'base/user/hooks/use-user.ts',
    'base/user/views/components/user-form.tsx',
    'base/user/views/data/columns.ts',
  ])
  assert.equal(result.status, 0, result.output)
})

test('Shared base API, locale and views directories are rejected', () => {
  const result = check(['base/api/user.ts', 'base/locales/user.ts', 'base/views/permission/user/index.tsx'])
  assert.equal(result.status, 1)
  assert.match(result.output, /base: api\/ must be inside a page sub-module/)
  assert.match(result.output, /base: locales\/ must be inside a page sub-module/)
  assert.match(result.output, /base: views\/ must be inside a page sub-module/)
})

test('An extra permission grouping under base cannot replace a direct page sub-module', () => {
  const result = check(moduleFiles('base/permission/user'))
  assert.equal(result.status, 1)
  assert.match(result.output, /base\/permission: missing views\/index\.tsx/)
})

test('Page helpers stay in views/components or views/data', () => {
  const result = check([...moduleFiles('base/user'), 'base/user/views/hooks/use-user.ts'])
  assert.equal(result.status, 1)
  assert.match(result.output, /base\/user: unexpected views\/hooks/)
})

test('Malformed business directories are checked even when views/index.tsx is absent', () => {
  const result = check(['sales/orders/api/index.ts', 'sales/orders/locales/index.ts', 'sales/orders/utils/format.ts'])
  assert.equal(result.status, 1)
  assert.match(result.output, /sales\/orders: missing views\/index\.tsx/)
  assert.match(result.output, /sales\/orders: unexpected utils\//)
})

test('A shared entry does not exempt clients/types/utils/workspace from module structure', () => {
  const result = check({
    'sales/shared/index.ts': "export { client } from './clients/client'",
    'sales/shared/clients/client.ts': 'export const client = 1',
    'sales/shared/types/types.ts': 'export interface Row { id: number }',
    'sales/shared/utils/format.ts': 'export const format = String',
    'sales/shared/workspace/workspace.tsx': 'export const Workspace = () => null',
  })
  assert.equal(result.status, 1)
  for (const directory of ['clients', 'types', 'utils', 'workspace'])
    assert.match(result.output, new RegExp(`sales/shared: unexpected ${directory}/`))
})

test('Platform grouping and optional registration preserve the same leaf module rules', () => {
  const result = check([
    ...moduleFiles('ads/platform/product/templates'),
    'ads/platform/product/templates/register-ui.ts',
  ])
  assert.equal(result.status, 0, result.output)
})

test('Public entries use explicit named re-exports and contain no implementation', () => {
  for (const source of [
    "export * from './api'",
    'export const implementation = 1',
    "import { row } from './api'; export { row }",
  ]) {
    const result = check({
      ...Object.fromEntries(moduleFiles('sales/orders').map(file => [file, 'export {}'])),
      'sales/orders/index.ts': source,
    })
    assert.equal(result.status, 1)
    assert.match(result.output, /public entries only contain explicit named re-exports/)
  }
  const valid = check({
    ...Object.fromEntries(moduleFiles('sales/orders').map(file => [file, 'export {}'])),
    'sales/orders/index.ts': "export { createApi } from './api'; export type { Row } from './api'",
  })
  assert.equal(valid.status, 0, valid.output)
})

test('Hooks reject pure transformations and page configuration', () => {
  for (const source of [
    'export function format(value: number) { return String(value) }',
    "export const statusLabels = { ready: 'Ready' }",
  ]) {
    const result = check({
      ...Object.fromEntries(moduleFiles('sales/orders').map(file => [file, 'export {}'])),
      'sales/orders/hooks/helpers.ts': source,
    })
    assert.equal(result.status, 1)
    assert.match(result.output, /is not a Hook; move configuration and transformations to views\/data/)
  }
})

test('A Hook that only forwards an API factory is rejected', () => {
  const result = check({
    ...Object.fromEntries(moduleFiles('sales/orders').map(file => [file, 'export {}'])),
    'sales/orders/hooks/use-api.ts': 'export function useOrdersApi() { return useRuntimeFactory(createApi) }',
  })
  assert.equal(result.status, 1)
  assert.match(result.output, /useOrdersApi only calls an API factory/)
})

test('Hooks cannot hide page configuration behind wildcard or namespace re-exports', () => {
  for (const source of ["export * from '../views/data/config'", "export * as config from '../views/data/config'"]) {
    const result = check({
      ...Object.fromEntries(moduleFiles('sales/orders').map(file => [file, 'export {}'])),
      'sales/orders/views/data/config.ts': "export const statusLabels = { ready: 'Ready' }",
      'sales/orders/hooks/index.ts': source,
    })
    assert.equal(result.status, 1)
    assert.match(result.output, /only explicit Hook exports and their types belong in hooks\//)
  }
})

test('Reusable state/lifecycle Hooks and their types remain optional and valid', () => {
  const result = check({
    ...Object.fromEntries(moduleFiles('sales/orders').map(file => [file, 'export {}'])),
    'sales/orders/api/types.ts': 'export type Row = { id: number }',
    'sales/orders/hooks/types.ts': "export type * from '../api/types'",
    'sales/orders/hooks/use-orders.ts': `
      import { useEffect, useState } from 'react'
      export function useOrders() {
        const [pending, setPending] = useState(false)
        useEffect(() => () => setPending(false), [])
        return { pending, setPending }
      }
      export type OrdersState = ReturnType<typeof useOrders>
    `,
  })
  assert.equal(result.status, 0, result.output)
})
