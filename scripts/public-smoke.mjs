import { mkdtempSync, mkdirSync, copyFileSync, symlinkSync, readFileSync, rmSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { listPublicFiles, projectRoot } from './public-files.mjs'
// The source tree is freshly materialized from an allowlist; local adapters and env files never enter it.
const destination = mkdtempSync(path.join(os.tmpdir(), 'mineadmin-public-'))
try {
  for (const file of listPublicFiles()) {
    const target = path.join(destination, file)
    mkdirSync(path.dirname(target), { recursive: true })
    copyFileSync(path.join(projectRoot, file), target)
  }
  // Reuse installed dependencies, but resolve every source import from the clean source tree.
  symlinkSync(path.join(projectRoot, 'node_modules'), path.join(destination, 'node_modules'), 'dir')
  for (const args of [
    ['run', 'check:framework'],
    ['run', 'check:bootstrap'],
    ['exec', 'tsc', '-b', '--pretty', 'false'],
    ['exec', 'vite', 'build', '--mode', 'public'],
  ]) {
    const result = spawnSync('pnpm', args, {
      cwd: destination,
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_APP_TITLE: 'MineAdmin',
        VITE_APP_ROOT_BASE: '/',
        VITE_APP_ROUTE_MODE: 'hash',
        VITE_IFRAME_ORIGINS: '',
      },
    })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`Public smoke failed: pnpm ${args.join(' ')}`)
  }
  const html = readFileSync(path.join(destination, 'dist-public/index.html'), 'utf8')
  if (!/frame-src (?:'none'|&#39;none&#39;)/.test(html)) throw new Error('Missing default iframe CSP')
  const assets = path.join(destination, 'dist-public/static/js')
  const sizes = readdirSync(assets)
    .filter(file => file.endsWith('.js'))
    .map(file => ({ file, size: readFileSync(path.join(assets, file)).length }))
  const oversized = sizes.filter(item => item.size > 600_000)
  if (oversized.length) throw new Error(`Public chunk budget exceeded: ${oversized.map(item => item.file).join(', ')}`)
  console.log(`Public chunk budget passed: max ${Math.max(...sizes.map(item => item.size))} bytes (limit 600000)`)
  console.log(
    `Public-only source smoke passed (${listPublicFiles().length} files; no private modules or local environment files)`,
  )
} finally {
  rmSync(destination, { recursive: true, force: true })
}
