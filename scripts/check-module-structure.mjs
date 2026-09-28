import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(scriptDirectory, '../src/modules')
if (!existsSync(sourceRoot) || !statSync(sourceRoot).isDirectory())
  throw new Error(`Invalid modules root: ${sourceRoot}`)
const allowedModuleEntries = new Set(['api', 'locales', 'hooks', 'views', 'index.ts', 'README.md'])
const allowedViewEntries = new Set(['components', 'data', 'index.tsx'])

function filesIn(directory) {
  if (!existsSync(directory)) return []
  const result = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...filesIn(absolute))
    else result.push(absolute)
  }
  return result
}

function directoriesIn(directory) {
  if (!existsSync(directory)) return []
  const result = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const absolute = path.join(directory, entry.name)
    result.push(absolute, ...directoriesIn(absolute))
  }
  return result
}

function relativeToSource(absolute) {
  return path.relative(sourceRoot, absolute).split(path.sep).join('/')
}

const failures = []
const modules = directoriesIn(sourceRoot).filter(directory => existsSync(path.join(directory, 'views', 'index.tsx')))
const popupFailures = []

for (const moduleDirectory of modules) {
  const moduleName = relativeToSource(moduleDirectory)
  for (const required of ['api', 'locales', 'views/index.tsx']) {
    if (!existsSync(path.join(moduleDirectory, required))) failures.push(`${moduleName}: missing ${required}`)
  }

  for (const entry of readdirSync(moduleDirectory, { withFileTypes: true })) {
    if (entry.isDirectory() && !allowedModuleEntries.has(entry.name))
      failures.push(`${moduleName}: unexpected ${entry.name}/`)
    if (entry.isFile() && !allowedModuleEntries.has(entry.name) && !/^register-.+\.ts$/.test(entry.name)) {
      failures.push(`${moduleName}: unexpected ${entry.name}`)
    }
  }

  const viewsDirectory = path.join(moduleDirectory, 'views')
  for (const entry of readdirSync(viewsDirectory, { withFileTypes: true })) {
    if (!allowedViewEntries.has(entry.name)) failures.push(`${moduleName}: unexpected views/${entry.name}`)
  }
  for (const file of filesIn(viewsDirectory)) {
    const relative = path.relative(viewsDirectory, file).split(path.sep).join('/')
    const [rootEntry] = relative.split('/')
    if (rootEntry !== 'index.tsx' && rootEntry !== 'components' && rootEntry !== 'data') {
      failures.push(`${moduleName}: unexpected views/${relative}`)
    }
  }
}

// base 是框架基础页面的父目录，每个直接子目录都必须是完整的页面子模块。
const baseDirectory = path.join(sourceRoot, 'base')
const sharedBaseDirectories = new Set(['api', 'locales', 'views', 'hooks', 'utils'])
for (const entry of existsSync(baseDirectory) ? readdirSync(baseDirectory, { withFileTypes: true }) : []) {
  if (!entry.isDirectory()) {
    if (entry.name !== 'README.md') failures.push(`base: unexpected ${entry.name}`)
    continue
  }
  if (sharedBaseDirectories.has(entry.name)) {
    failures.push(`base: ${entry.name}/ must be inside a page sub-module`)
    continue
  }
  for (const required of ['api', 'locales', 'views/index.tsx']) {
    if (!existsSync(path.join(baseDirectory, entry.name, required)))
      failures.push(`base/${entry.name}: missing ${required}`)
  }
}

for (const directory of directoriesIn(sourceRoot).filter(directory => existsSync(path.join(directory, 'api')))) {
  if (!existsSync(path.join(directory, 'views', 'index.tsx'))) {
    failures.push(`${relativeToSource(directory)}: api/ has no views/index.tsx`)
  }
}

for (const file of filesIn(sourceRoot).filter(file => /\.(ts|tsx)$/.test(file))) {
  const source = readFileSync(file, 'utf8')
  if (
    /@\/components\/reui\/primitives\/dialog|@\/components\/reui\/confirm-dialog|window\.(?:confirm|prompt)\s*\(/.test(
      source,
    ) ||
    /<Dialog(?:Content|Header|Title|Description|Footer)?\b/.test(source)
  ) {
    popupFailures.push(relativeToSource(file))
  }
}
failures.push(...popupFailures.map(file => `${file}: use MaDialog/MaDrawer or their hooks instead of a raw popup`))

const tableWarnings = []
for (const moduleDirectory of modules) {
  const source = filesIn(moduleDirectory)
    .filter(file => /\.(ts|tsx)$/.test(file))
    .map(file => readFileSync(file, 'utf8'))
    .join('\n')
  if (/(?:\b(?:DataGrid|useReactTable)|useTable\s*\(|<table\b)/.test(source))
    tableWarnings.push(relativeToSource(moduleDirectory))
}

console.log(`Checked ${modules.length} business sub-modules`)
if (tableWarnings.length) console.log(`Table implementation review required: ${tableWarnings.join(', ')}`)
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log('All sub-modules match api/locales/views structure')
}
