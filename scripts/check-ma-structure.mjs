import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { projectRoot } from './public-files.mjs'

const directories = new Set(['components', 'hooks', 'types', 'utils', 'context', 'data', 'illustrations'])
const sourcePattern = /\.[cm]?[jt]sx?$/

function sources(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? sources(file) : entry.isFile() && sourcePattern.test(entry.name) ? [file] : []
  })
}

/** Check physical layout and stable imports, including Git-ignored application modules and plugins. */
export function checkMaStructure(root = projectRoot) {
  const failures = []
  const componentRoot = path.join(root, 'src/components')
  if (!existsSync(componentRoot)) return failures
  const relative = file => path.relative(root, file).split(path.sep).join('/')
  for (const entry of readdirSync(componentRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('ma-')) continue
    const directory = path.join(componentRoot, entry.name)
    for (const required of ['types/index.ts', 'README.md']) {
      if (!existsSync(path.join(directory, required))) failures.push(`${relative(directory)}: missing ${required}`)
    }
    if (!sources(path.join(directory, 'components')).length)
      failures.push(`${relative(directory)}: missing components implementation`)
    for (const child of readdirSync(directory, { withFileTypes: true })) {
      if (child.name === '.DS_Store') continue
      const allowed = child.isDirectory()
        ? directories.has(child.name)
        : child.isFile() && ['index.ts', 'index.tsx', 'README.md'].includes(child.name)
      if (!allowed) failures.push(`${relative(directory)}/${child.name}: misplaced component file or directory`)
    }
    const entries = ['index.ts', 'index.tsx'].map(name => path.join(directory, name)).filter(existsSync)
    if (!entries.length) failures.push(`${relative(directory)}: missing index.ts or index.tsx`)
    for (const index of entries) {
      const source = ts.createSourceFile(index, readFileSync(index, 'utf8'), ts.ScriptTarget.Latest, true)
      for (const statement of source.statements) {
        if (
          !ts.isExportDeclaration(statement) ||
          !statement.moduleSpecifier ||
          !ts.isStringLiteral(statement.moduleSpecifier)
        ) {
          failures.push(`${relative(index)}: public entry must only re-export declarations`)
          continue
        }
        const hasTypes =
          statement.isTypeOnly ||
          (statement.exportClause &&
            ts.isNamedExports(statement.exportClause) &&
            statement.exportClause.elements.some(element => element.isTypeOnly))
        const target = statement.moduleSpecifier.text
        if (hasTypes && !/^\.\/types(?:\/|$)/.test(target) && !/^\.\.\/ma-[^/]+$/.test(target))
          failures.push(`${relative(index)}: public types must come from types/ or another component's public entry`)
      }
    }
  }
  for (const file of sources(path.join(root, 'src'))) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const owner = relative(file).match(/^src\/components\/(ma-[^/]+)\//)?.[1]
    const checkImport = specifier => {
      if (!specifier || !ts.isStringLiteral(specifier)) return
      const value = specifier.text
      const target = value.startsWith('@/')
        ? `src/${value.slice(2)}`
        : value.startsWith('.')
          ? relative(path.resolve(path.dirname(file), value))
          : ''
      const match = target.match(/^src\/components\/(ma-[^/]+)\/(.+)$/)
      if (match && owner !== match[1])
        failures.push(`${relative(file)}: use the public entry of ${match[1]} instead of ${value}`)
    }
    const visit = node => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) checkImport(node.moduleSpecifier)
      else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) checkImport(node.argument.literal)
      else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      )
        checkImport(node.arguments[0])
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return failures
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = checkMaStructure()
  if (failures.length) {
    console.error(failures.join('\n'))
    process.exitCode = 1
  } else console.log('Ma component layout and public entry imports: passed')
}
