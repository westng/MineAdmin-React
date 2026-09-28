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
    for (const file of files) {
      const target = path.join(root, file)
      mkdirSync(path.dirname(target), { recursive: true })
      writeFileSync(target, 'export {}\n')
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
