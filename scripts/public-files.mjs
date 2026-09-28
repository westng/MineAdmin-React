import { readdirSync, readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
export const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const roots = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  'tsconfig.node.json',
  'tsconfig.ma-components.json',
  'vite.config.ts',
  'eslint.config.js',
  '.prettierrc.json',
  '.prettierignore',
  '.gitignore',
  '.env.example',
  '.node-version',
  '.npmrc',
  'components.json',
  'index.html',
  'LICENSE',
  'MENU_FIX_SUMMARY.md',
  'QUICK_START.md',
  'THIRD_PARTY_NOTICES.md',
  'THIRD_PARTY_SOURCE.json',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'README.md',
  'ARCHITECTURE.md',
])
export function isPublicFile(file) {
  if (file.split('/').some(part => part === '.DS_Store' || part.startsWith('._'))) return false
  if (file.startsWith('/') || file.includes('\\') || file.split('/').some(part => part === '..')) return false
  if (roots.has(file)) return true
  if (file.startsWith('src/')) {
    if (file.startsWith('src/plugins/')) return false
    if (file.startsWith('src/modules/')) return file.startsWith('src/modules/base/')
    if (file.startsWith('src/components/')) return /^src\/components\/(ma-[^/]+|reui)\//.test(file)
    if (file === 'src/app/application.tsx') return false
    if (file.startsWith('src/app/'))
      return /^src\/app\/(?:App\.tsx|main\.tsx|bootstrap\.ts|runtime\/(?:instance|create-runtime)\.ts|default-application\.ts|styles\/default\.css)$/.test(
        file,
      )
    if (file.startsWith('src/assets/'))
      return (
        file.startsWith('src/assets/styles/') ||
        file.startsWith('src/assets/icons/') ||
        file.startsWith('src/assets/images/') ||
        /^src\/assets\/fonts\/inter\/(?:Inter-latin\.woff2|OFL\.txt)$/.test(file)
      )
    return /^src\/(?:hooks|layouts|provider|router|services|store|types|utils)\//.test(file)
  }
  if (/^(examples|\.githooks|\.github)\//.test(file)) return true
  if (/^docs\/(?:MIGRATION|EXTENSIONS|MENU_MIGRATION|ROUTING)\.md$/.test(file)) return true
  if (/^scripts\/(?:check-[\w-]+|public-files|public-smoke|export-public|setup-git-hooks)\.mjs$/.test(file)) return true
  if (
    /^tests\/(?:framework-[\w-]+|component-boundaries|frontend-session|dashboard-slot|ma-components)\.(?:test\.mjs|types\.tsx)$/.test(
      file,
    )
  )
    return true
  return file === 'public/mineadmin.svg' || file === 'public/favicon.ico'
}
export function listPublicFiles(root = projectRoot) {
  const visit = directory =>
    readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      if (['node_modules', '.git', '.cache'].includes(entry.name) || entry.name.startsWith('dist')) return []
      const absolute = path.join(directory, entry.name)
      const relative = path.relative(root, absolute).split(path.sep).join('/')
      return entry.isDirectory() ? visit(absolute) : entry.isFile() && isPublicFile(relative) ? [relative] : []
    })
  return visit(root).sort()
}

/** Release exports read immutable Git blobs; working-tree previews are explicit. */
export function publicSource({ root = projectRoot, workingTree = false, ref = 'HEAD' } = {}) {
  if (workingTree)
    return {
      source: 'working-tree',
      revision: null,
      files: listPublicFiles(root),
      read: file => readFileSync(path.join(root, file)),
      mode: file => statSync(path.join(root, file)).mode & 0o777,
    }
  const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 })
  const revision = git(['rev-parse', '--verify', `${ref}^{commit}`])
    .toString()
    .trim()
  const entries = new Map()
  for (const entry of git(['ls-tree', '-rz', '--full-tree', revision]).toString().split('\0').filter(Boolean)) {
    const [metadata, file] = entry.split('\t')
    if (!isPublicFile(file)) continue
    const [mode, type, hash] = metadata.split(' ')
    if (type !== 'blob' || !['100644', '100755'].includes(mode)) throw new Error(`Unsupported public entry: ${file}`)
    entries.set(file, { hash, mode: Number.parseInt(mode, 8) & 0o777 })
  }
  return {
    source: 'git',
    revision,
    files: [...entries.keys()].sort(),
    read: file => {
      const entry = entries.get(file)
      if (!entry) throw new Error(`Not a public file: ${file}`)
      return git(['cat-file', 'blob', entry.hash])
    },
    mode: file => entries.get(file).mode,
  }
}
