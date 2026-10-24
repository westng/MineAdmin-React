import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { checkApplicationBoundaries } from '../scripts/check-application-boundaries.mjs'

test('Architecture guard enforces store, service, provider and UI-hook ownership after resolving imports', t => {
  const cases = [
    ['src/store/settings/create-store.ts', 'src/router/dashboard.ts', '@/router/dashboard', /pure store/],
    [
      'src/provider/plugins/probe.ts',
      'src/modules/order/api.ts',
      '../../modules/order/api',
      /provider depends on business/,
    ],
    [
      'src/hooks/ui/probe.ts',
      'src/provider/runtime/context.ts',
      '@/provider/runtime/context',
      /UI hook depends on application/,
    ],
    [
      'src/modules/order/api.ts',
      'src/app/runtime/instance.ts',
      '@/app/runtime/instance',
      /only application composition/,
    ],
    ['src/services/i18n/probe.ts', 'src/hooks/i18n/probe.ts', '@/hooks/i18n/probe', /service depends on application/],
  ]
  for (const [source, target, specifier, expected] of cases) {
    const root = mkdtempSync(path.join(tmpdir(), 'ownership-boundary-'))
    t.after(() => rmSync(root, { recursive: true, force: true }))
    for (const file of [source, target]) mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, target), 'export const value = 1')
    writeFileSync(path.join(root, source), `import { value } from '${specifier}'; export const probe = value`)
    assert.match(checkApplicationBoundaries(root).failures.join('\n'), expected)
    writeFileSync(path.join(root, source), 'export const probe = 1')
    assert.deepEqual(checkApplicationBoundaries(root).failures, [])
  }
  const root = mkdtempSync(path.join(tmpdir(), 'query-ui-boundary-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(path.join(root, 'src/services/query'), { recursive: true })
  const file = path.join(root, 'src/services/query/probe.ts')
  writeFileSync(file, "import { useQuery as consume } from '@tanstack/react-query'; export { consume }")
  assert.match(checkApplicationBoundaries(root).failures.join('\n'), /non-component implementation depends on React UI/)
  writeFileSync(file, "import { QueryClient } from '@tanstack/react-query'; export { QueryClient }")
  assert.deepEqual(checkApplicationBoundaries(root).failures, [])
})

test('Application guard includes ignored business sources, resolves aliases and rejects private view coupling', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'application-boundaries-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (file, contents) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), contents)
  }
  write('.gitignore', 'src/modules/private/\n')
  write(
    'src/modules/private/one/views/index.tsx',
    "import { secret } from '@/modules/private/two/views/data/secret'; export const page = secret",
  )
  write('src/modules/private/two/views/data/secret.ts', 'export const secret = 1')
  assert.equal(checkApplicationBoundaries(root).failures.length, 1)
  write('src/modules/private/two/index.ts', "export { secret } from './views/data/secret'")
  write(
    'src/modules/private/one/views/index.tsx',
    "import { secret } from '@/modules/private/two'; export const page = secret",
  )
  assert.deepEqual(checkApplicationBoundaries(root).failures, [])
  write(
    'src/plugins/example/index.ts',
    "import { page } from '@/modules/private/one/views'; export const plugin = page",
  )
  write(
    'src/modules/private/two/views/data/secret.ts',
    "import { page } from '@/modules/private/one/views'; export const secret = page",
  )
  assert.ok(
    checkApplicationBoundaries(root).failures.some(failure => failure.startsWith('Circular runtime dependency:')),
  )
})
