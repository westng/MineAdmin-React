import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, symlinkSync, rmSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { publicSource, isPublicFile, projectRoot } from '../scripts/public-files.mjs'

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mine-governance-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (file, text) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), text)
  }
  return { root, write }
}

test('发布源固定到 Git blob，工作树修改、未提交文件和系统文件只按显式规则处理', t => {
  const { root, write } = fixture(t)
  const git = (args, input) =>
    execFileSync('git', args, {
      cwd: root,
      input,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Fixture',
        GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: 'Fixture',
        GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      },
    }).trim()
  git(['init', '--quiet'])
  const blob = git(['hash-object', '-w', '--stdin'], 'committed')
  const tree = git(['mktree'], `100644 blob ${blob}\tREADME.md\n`)
  const commit = git(['commit-tree', tree, '-m', 'fixture'])
  git(['update-ref', 'HEAD', commit])
  write('README.md', 'uncommitted')
  write('src/services/new.ts', 'untracked')
  write('src/services/.DS_Store', 'metadata')
  write('src/modules/private/index.ts', 'private')
  const release = publicSource({ root })
  assert.deepEqual(release.files, ['README.md'])
  assert.equal(release.read('README.md').toString(), 'committed')
  assert.equal(release.revision, commit)
  const preview = publicSource({ root, workingTree: true })
  assert.deepEqual(preview.files, ['README.md', 'src/services/new.ts'])
  assert.equal(preview.read('README.md').toString(), 'uncommitted')
  assert.equal(isPublicFile('src/services/._file'), false)
})

test('依赖门禁同时拦截相对路径、别名越层与真实值循环，允许类型契约', t => {
  const { root, write } = fixture(t)
  write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] }, moduleResolution: 'Bundler', module: 'ESNext' },
    }),
  )
  write('src/provider/fixture.ts', 'export const value = 1')
  mkdirSync(path.join(root, 'scripts'))
  for (const file of ['check-core-boundaries.mjs', 'check-dependency-graph.mjs', 'public-files.mjs'])
    copyFileSync(path.join(projectRoot, 'scripts', file), path.join(root, 'scripts', file))
  symlinkSync(path.join(projectRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir')
  const check = () =>
    spawnSync(process.execPath, ['scripts/check-core-boundaries.mjs'], { cwd: root, encoding: 'utf8' })
  for (const specifier of ['@/provider/fixture', '../provider/fixture']) {
    write('src/services/probe.ts', `import { value } from '${specifier}'; export const probe = value`)
    const result = check()
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /service depends on application/)
  }
  write('src/services/probe.ts', "import { value } from './other'; export const probe = () => value")
  write('src/services/other.ts', "import { probe } from './probe'; export const value = () => probe")
  const cycle = check()
  assert.notEqual(cycle.status, 0)
  assert.match(cycle.stderr, /cycle/i)
  write('src/services/probe.ts', "import type { Value } from './other'; export type Probe = { value: Value }")
  write('src/services/other.ts', "import type { Probe } from './probe'; export type Value = { probe?: Probe }")
  assert.equal(check().status, 0)
})
