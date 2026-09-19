import { readdirSync } from 'node:fs'
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
  'README.md',
  'ARCHITECTURE.md',
])
export function isPublicFile(file) {
  if (file.startsWith('/') || file.includes('\\') || file.split('/').some(part => part === '..')) return false
  if (roots.has(file)) return true
  if (file.startsWith('src/')) {
    if (file.startsWith('src/plugins/')) return false
    if (file.startsWith('src/modules/')) return file.startsWith('src/modules/base/')
    if (file.startsWith('src/components/')) return /^src\/components\/(ma-[^/]+|reui)\//.test(file)
    if (file === 'src/app/application.tsx') return false
    if (file.startsWith('src/app/'))
      return /^src\/app\/(?:App\.tsx|main\.tsx|bootstrap\.tsx|runtime\.ts|default-application\.ts|default-styles\.css)$/.test(
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
  if (/^docs\/(?:MIGRATION|EXTENSIONS|MENU_MIGRATION)\.md$/.test(file)) return true
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
