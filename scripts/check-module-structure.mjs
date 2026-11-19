import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { inspectCrudViews } from './check-crud-view-structure.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(scriptDirectory, '../src/modules')
if (!existsSync(sourceRoot) || !statSync(sourceRoot).isDirectory())
  throw new Error(`Invalid modules root: ${sourceRoot}`)
const moduleDirectories = new Set(['api', 'locales', 'hooks', 'views'])
const moduleFiles = new Set(['index.ts', 'README.md'])
const allowedViewEntries = new Set(['components', 'data', 'index.tsx'])

function filesIn(directory) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) return []
  const result = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...filesIn(absolute))
    else result.push(absolute)
  }
  return result
}

function directoriesIn(directory) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) return []
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
const modules = []
const popupFailures = []

// Discover ownership from every directory, including malformed modules without a page entry.
function discoverModules(directory) {
  const entries = readdirSync(directory, { withFileTypes: true }).filter(entry => entry.name !== '.DS_Store')
  if (
    directory !== sourceRoot &&
    entries.some(
      entry =>
        moduleDirectories.has(entry.name) ||
        entry.name === 'index.ts' ||
        /^register-.+\.ts$/.test(entry.name) ||
        (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)),
    )
  ) {
    modules.push(directory)
    return
  }
  for (const entry of entries) {
    if (entry.isDirectory()) discoverModules(path.join(directory, entry.name))
    else if (entry.name !== 'README.md') failures.push(`${relativeToSource(directory)}: unexpected ${entry.name}`)
  }
}

discoverModules(sourceRoot)

function inspectPublicEntry(file, moduleName) {
  if (!existsSync(file) || !statSync(file).isFile()) return
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  if (
    !source.statements.length ||
    source.statements.some(
      statement =>
        !ts.isExportDeclaration(statement) ||
        !statement.moduleSpecifier ||
        !statement.exportClause ||
        !ts.isNamedExports(statement.exportClause) ||
        !statement.exportClause.elements.length,
    )
  )
    failures.push(`${moduleName}/index.ts: public entries only contain explicit named re-exports`)
}

function inspectHookExports(file) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const relative = relativeToSource(file)
  const inspect = (name, implementation) => {
    if (!/^use[A-Z]/.test(name)) {
      failures.push(`${relative}: ${name} is not a Hook; move configuration and transformations to views/data`)
      return
    }
    if (!implementation) return
    const calls = []
    const visit = node => {
      if (ts.isCallExpression(node)) {
        const name = ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : ts.isIdentifier(node.expression)
            ? node.expression.text
            : ''
        if (/^use[A-Z]/.test(name)) calls.push(name)
      }
      ts.forEachChild(node, visit)
    }
    visit(implementation)
    if (!calls.length || calls.every(name => name === 'useRuntimeFactory'))
      failures.push(`${relative}: ${name} only calls an API factory; use the API in its consumer directly`)
  }
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue
      if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
        failures.push(`${relative}: only explicit Hook exports and their types belong in hooks/`)
        continue
      }
      for (const item of statement.exportClause.elements) {
        if (!item.isTypeOnly) inspect(item.name.text)
      }
      continue
    }
    if (!statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue
    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) continue
    if (ts.isFunctionDeclaration(statement)) inspect(statement.name?.text ?? 'default', statement.body)
    else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations)
        inspect(
          declaration.name.getText(source),
          declaration.initializer &&
            (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
            ? declaration.initializer.body
            : declaration.initializer,
        )
    } else failures.push(`${relative}: only Hook implementations and their types belong in hooks/`)
  }
}

for (const moduleDirectory of modules) {
  const moduleName = relativeToSource(moduleDirectory)
  for (const required of ['api', 'locales', 'views']) {
    const absolute = path.join(moduleDirectory, required)
    if (!existsSync(absolute) || !statSync(absolute).isDirectory()) failures.push(`${moduleName}: missing ${required}/`)
  }
  const page = path.join(moduleDirectory, 'views/index.tsx')
  if (!existsSync(page) || !statSync(page).isFile()) failures.push(`${moduleName}: missing views/index.tsx`)

  for (const entry of readdirSync(moduleDirectory, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue
    if (entry.isDirectory() && !moduleDirectories.has(entry.name))
      failures.push(`${moduleName}: unexpected ${entry.name}/`)
    if (entry.isFile() && !moduleFiles.has(entry.name) && !/^register-.+\.ts$/.test(entry.name)) {
      failures.push(`${moduleName}: unexpected ${entry.name}`)
    }
  }
  inspectPublicEntry(path.join(moduleDirectory, 'index.ts'), moduleName)
  for (const file of filesIn(path.join(moduleDirectory, 'hooks')).filter(file => /\.(ts|tsx)$/.test(file)))
    inspectHookExports(file)

  const viewsDirectory = path.join(moduleDirectory, 'views')
  if (!existsSync(viewsDirectory) || !statSync(viewsDirectory).isDirectory()) continue
  for (const entry of readdirSync(viewsDirectory, { withFileTypes: true }).filter(
    entry => entry.name !== '.DS_Store',
  )) {
    if (!allowedViewEntries.has(entry.name)) failures.push(`${moduleName}: unexpected views/${entry.name}`)
  }
  const viewFiles = filesIn(viewsDirectory)
  failures.push(
    ...inspectCrudViews(
      viewFiles
        .filter(file => /\.tsx?$/.test(file))
        .map(file => ({ file: relativeToSource(file), source: readFileSync(file, 'utf8') })),
    ),
  )
  for (const file of viewFiles) {
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
