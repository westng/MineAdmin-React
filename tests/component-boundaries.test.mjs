import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync, renameSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { checkComponentBoundaries } from '../scripts/check-component-boundaries.mjs'
import { isPublicFile, listPublicFiles } from '../scripts/public-files.mjs'
import { checkSourceStructure } from '../scripts/check-source-structure.mjs'
import { checkMaStructure } from '../scripts/check-ma-structure.mjs'

test('Ma layout enforces public entries, type ownership and imports from ignored plugins', t => {
  assert.deepEqual(checkMaStructure(), [])
  const root = mkdtempSync(path.join(os.tmpdir(), 'ma-layout-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (file, source) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), source)
  }
  const base = 'src/components/ma-example'
  write(`${base}/index.ts`, "export { Example } from './components/example'\nexport type { Props } from './types'")
  write(
    `${base}/components/example.tsx`,
    "import type { Props } from '../types'; export function Example(props: Props) { return props.title }",
  )
  write(`${base}/types/index.ts`, 'export interface Props { title: string }')
  write(`${base}/README.md`, '# Example')
  write('.gitignore', 'src/plugins/')
  write('src/plugins/example/index.ts', "export { Example } from '@/components/ma-example'")
  assert.deepEqual(checkMaStructure(root), [])

  renameSync(path.join(root, base, 'index.ts'), path.join(root, base, 'index.tsx'))
  assert.deepEqual(checkMaStructure(root), [])
  renameSync(path.join(root, base, 'index.tsx'), path.join(root, base, 'index.ts'))

  write(`${base}/use-example.ts`, 'export function useExample() {}')
  write(`${base}/index.ts`, "export const example = 1; export type { Props } from './components/example'")
  write('src/plugins/example/index.ts', "export { Example } from '@/components/ma-example/components/example'")
  mkdirSync(path.join(root, 'src/components/ma-missing'), { recursive: true })
  const failures = checkMaStructure(root)
  for (const reason of [
    'misplaced',
    'only re-export',
    'public types',
    'src/plugins/example',
    'missing index.ts',
    'missing types/index.ts',
    'missing README.md',
    'missing components',
  ])
    assert.ok(
      failures.some(failure => failure.includes(reason)),
      reason,
    )
})

test('source layout rejects retired entry points and misplaced private components', t => {
  assert.deepEqual(checkSourceStructure(), [])
  const root = mkdtempSync(path.join(os.tmpdir(), 'source-layout-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(path.join(root, 'src/components/ui'), { recursive: true })
  mkdirSync(path.join(root, 'src/hooks'), { recursive: true })
  mkdirSync(path.join(root, 'src/app/private'), { recursive: true })
  writeFileSync(path.join(root, 'src/.DS_Store'), '')
  writeFileSync(path.join(root, 'src/main.tsx'), 'import "./app/main"')
  writeFileSync(path.join(root, 'src/hooks/useCache.ts'), '')
  assert.deepEqual(
    new Set(checkSourceStructure(root)),
    new Set(['src/main.tsx', 'src/components/ui', 'src/hooks/useCache.ts', 'src/app/private']),
  )
})

test('public export excludes business files, unknown source roots, local configuration and symlinks', t => {
  for (const file of [
    'src/app/runtime/create-runtime.ts',
    'src/app/runtime/instance.ts',
    'src/app/bootstrap.ts',
    'src/app/styles/default.css',
  ])
    assert.equal(isPublicFile(file), true, file)
  for (const file of [
    'src/plugins/demo/index.ts',
    'src/modules/account/index.ts',
    'src/components/ui/button.tsx',
    'src/app/application.tsx',
    'src/app/config/branding.ts',
    'src/app/config/menu-policy.ts',
    'src/app/styles/application.css',
    'src/components/business/douyin-user-parser/index.ts',
    'src/unreviewed/domain.ts',
    'src/assets/fonts/private-font.woff2',
    'src/assets/fonts/inter/unreviewed.woff2',
    '.env.local',
    '../src/main.tsx',
  ]) {
    assert.equal(isPublicFile(file), false, file)
  }
  const root = mkdtempSync(path.join(os.tmpdir(), 'public-manifest-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(path.join(root, 'src/services'), { recursive: true })
  const fontFiles = ['src/assets/fonts/inter/Inter-latin.woff2', 'src/assets/fonts/inter/OFL.txt']
  mkdirSync(path.join(root, 'src/assets/fonts/inter'), { recursive: true })
  for (const file of fontFiles) writeFileSync(path.join(root, file), 'public font fixture')
  writeFileSync(path.join(root, 'src/services/allowed.ts'), 'export const allowed = true')
  writeFileSync(path.join(root, '.env.local'), 'SYNTHETIC_SECRET=not-a-credential')
  symlinkSync(path.join(root, '.env.local'), path.join(root, 'src/services/link.ts'))
  assert.deepEqual(listPublicFiles(root), [...fontFiles, 'src/services/allowed.ts'])
})

test('all public component dependencies stay inside the reviewed closure', () => {
  const result = checkComponentBoundaries()
  assert.ok(result.entries > 100)
  assert.deepEqual(result.failures, [])
})

test('boundary guard rejects relative, aliased, type-only and transitive private dependencies', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'component-boundary-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (file, content) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), content)
  }
  write(
    'tsconfig.json',
    JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] }, moduleResolution: 'Bundler' } }),
  )
  write(
    'src/components/reui/a.ts',
    "export * from './b'; import type { Secret } from '@/components/shared/types'; import('../../plugins/private')",
  )
  write('src/components/reui/b.ts', "export * from '../ui/button'")
  write('src/components/ui/button.ts', 'export const Button = 1')
  write('src/components/shared/types.ts', 'export type Secret = string')
  write('src/plugins/private.ts', 'export default 1')
  const result = checkComponentBoundaries(root)
  assert.equal(result.failures.length, 3)
  for (const forbidden of ['components/ui/button', 'components/shared/types', 'plugins/private']) {
    assert.ok(result.failures.some(message => message.includes(forbidden)))
  }
})
