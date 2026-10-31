import assert from 'node:assert/strict'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { checkRelease, extractReleaseNotes, parseReleaseTag } from '../scripts/check-release.mjs'
import { isPublicFile, projectRoot } from '../scripts/public-files.mjs'

const notes = `## [1.2.3] - 2026-10-30

### 兼容性变化

- 调用方需要更新参数。

### 升级注意事项

保留完整示例：

\`\`\`markdown
## [0.1.0] - 2020-01-01
这个标题是示例的一部分。
\`\`\`

- 执行 \`pnpm run check\`。
`
const changelog = `# 变更记录

## Unreleased

- 尚未发布的修改。

${notes}
## [1.2.2] - 2026-10-29

- 上一个版本。
`

function repository(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mineadmin-release-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const git = (args, input) =>
    execFileSync('git', args, {
      cwd: root,
      input,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Release fixture',
        GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: 'Release fixture',
        GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      },
    }).trim()
  git(['init', '--quiet'])
  let revision
  const commit = ({ version = '1.2.3', log = changelog } = {}) => {
    const files = { 'CHANGELOG.md': log, 'package.json': JSON.stringify({ version }) }
    const entries = Object.entries(files).map(([file, content]) => {
      const blob = git(['hash-object', '-w', '--stdin'], content)
      return `100644 blob ${blob}\t${file}\n`
    })
    const tree = git(['mktree'], entries.join(''))
    revision = git(['commit-tree', tree, ...(revision ? ['-p', revision] : []), '-m', 'release fixture'])
    git(['update-ref', 'HEAD', revision])
    return revision
  }
  const copyScripts = () => {
    mkdirSync(path.join(root, 'scripts'))
    for (const script of ['check-release.mjs', 'public-files.mjs', 'public-smoke.mjs'])
      copyFileSync(path.join(projectRoot, 'scripts', script), path.join(root, 'scripts', script))
  }
  return { root, git, commit, copyScripts }
}

test('release tags support stable and prerelease versions and reject unsafe or ambiguous inputs', () => {
  assert.deepEqual(parseReleaseTag('v1.2.3'), { tag: 'v1.2.3', version: '1.2.3', prerelease: false })
  assert.deepEqual(parseReleaseTag('v1.2.3-rc.1'), {
    tag: 'v1.2.3-rc.1',
    version: '1.2.3-rc.1',
    prerelease: true,
  })
  for (const tag of [undefined, '1.2.3', 'main', 'v01.2.3', 'v1.2.3-rc.01', 'v1.2.3-rc.', 'v1.2.3+build', 'v../x'])
    assert.throws(() => parseReleaseTag(tag), /Release tag must/)
  assert.equal(isPublicFile('scripts/check-release.mjs'), true)
  assert.equal(isPublicFile('tests/framework-release.test.mjs'), true)
})

test('release notes contain the complete version entry and preserve fenced examples', () => {
  assert.equal(extractReleaseNotes(changelog, '1.2.3'), notes)
  assert.equal(extractReleaseNotes(changelog.replace(/\n/g, '\r\n'), '1.2.3'), notes)
})

test('release notes refuse unarchived, duplicate, empty or invalidly dated entries', () => {
  for (const log of ['# 变更记录\n\n## Unreleased\n\n- 等待发布。\n', `${changelog}\n${notes}`])
    assert.throws(() => extractReleaseNotes(log, '1.2.3'), /exactly one released entry/)
  assert.throws(
    () => extractReleaseNotes('## Unreleased\n\n## [1.2.3] - 2026-10-30\n', '1.2.3'),
    /contain release notes/,
  )
  assert.throws(() => extractReleaseNotes(changelog.replace('2026-10-30', '2026-02-30'), '1.2.3'), /valid YYYY-MM-DD/)
  assert.throws(
    () => extractReleaseNotes(changelog.replace('## Unreleased', '## Changes'), '1.2.3'),
    /retain an Unreleased/,
  )
})

test('release metadata reads the annotated tag commit rather than dirty working-tree versions or notes', t => {
  const { root, git, commit } = repository(t)
  const revision = commit()
  git(['tag', '--annotate', 'v1.2.3', '-m', 'fixture release'])
  writeFileSync(path.join(root, 'package.json'), '{"version":"9.9.9"}')
  writeFileSync(path.join(root, 'CHANGELOG.md'), '# Uncommitted notes')
  assert.deepEqual(checkRelease('v1.2.3', { root }), {
    tag: 'v1.2.3',
    version: '1.2.3',
    prerelease: false,
    revision,
    notes,
  })
})

test('release metadata blocks a mismatched package version and a tag pointing away from HEAD', t => {
  const { root, git, commit } = repository(t)
  commit({ version: '1.2.4' })
  git(['tag', 'v1.2.3'])
  assert.throws(() => checkRelease('v1.2.3', { root }), /does not match package.json/)
  commit()
  assert.throws(() => checkRelease('v1.2.3', { root }), /checked-out HEAD/)
})

test('release CLI writes complete notes and safe outputs and refuses overwriting an existing notes file', t => {
  const { root, git, commit, copyScripts } = repository(t)
  const revision = commit()
  git(['tag', 'v1.2.3'])
  copyScripts()
  const directory = path.join(root, 'release notes')
  const output = path.join(root, 'github-output')
  const run = () =>
    spawnSync(process.execPath, ['scripts/check-release.mjs', '--', 'v1.2.3', directory], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_OUTPUT: output },
    })
  const first = run()
  assert.equal(first.status, 0, first.stderr)
  assert.equal(readFileSync(path.join(directory, 'RELEASE_NOTES.md'), 'utf8'), notes)
  const outputs = `tag=v1.2.3\nversion=1.2.3\nrevision=${revision}\nprerelease=false\n`
  assert.equal(readFileSync(output, 'utf8'), outputs)
  const second = run()
  assert.notEqual(second.status, 0)
  assert.match(second.stderr, /EEXIST/)
  assert.equal(readFileSync(path.join(directory, 'RELEASE_NOTES.md'), 'utf8'), notes)
  assert.equal(readFileSync(output, 'utf8'), outputs)
})

test('retained public builds refuse dirty snapshots, missing destinations and existing directories', t => {
  const { root, commit, copyScripts } = repository(t)
  commit()
  copyScripts()
  const destination = path.join(root, 'retained')
  for (const [args, message] of [
    [['--working-tree', '--output-dir', destination], /committed Git snapshot/],
    [['--output-dir'], /requires a new destination/],
    [['--output-dir', root], /destination already exists/],
  ]) {
    const result = spawnSync(process.execPath, ['scripts/public-smoke.mjs', ...args], { cwd: root, encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, message)
    assert.equal(existsSync(destination), false)
  }
})
