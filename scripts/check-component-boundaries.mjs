import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))

function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? sources(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : []
  })
}

// Traverse resolved files, including relative imports, type imports and re-exports.
export function checkComponentBoundaries(root = projectRoot) {
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile)
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  const componentRoot = path.join(root, 'src/components')
  const entries = readdirSync(componentRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^(ma-.+|reui)$/.test(entry.name))
    .flatMap(entry => sources(path.join(componentRoot, entry.name)))
  const permittedLeaves = new Set([
    'src/utils/cn.ts',
    'src/utils/icons.ts',
    'src/components/ma-icon/use-icon.ts',
    'src/hooks/framework/use-mobile.ts',
    'src/assets/icons/catalog.json',
  ])
  const failures = []
  const seen = new Set()
  const inspect = (file, chain = []) => {
    if (seen.has(file)) return
    seen.add(file)
    const relative = path.relative(root, file).split(path.sep).join('/')
    if (!/^src\/components\/(ma-[^/]+|reui)\//.test(relative) && !permittedLeaves.has(relative)) {
      failures.push([...chain, relative].join(' -> '))
      return
    }
    const nextChain = [...chain, relative]
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const resolve = specifier => {
      const target = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule
      if (target?.isExternalLibraryImport) return
      if (!target) {
        failures.push(`${nextChain.join(' -> ')} -> unresolved: ${specifier}`)
        return
      }
      inspect(target.resolvedFileName, nextChain)
    }
    const visit = node => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        resolve(node.moduleSpecifier.text)
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        resolve(node.argument.literal.text)
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        if (node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) resolve(node.arguments[0].text)
        else failures.push(`${relative}: computed module import is forbidden`)
      } else if (ts.isCallExpression(node) && node.expression.getText(source).startsWith('import.meta.glob')) {
        // This audited leaf only loads SVG assets. Components may not glob private code.
        if (relative !== 'src/utils/icons.ts' || node.arguments[0]?.getText(source) !== "'/src/assets/icons/*.svg'") {
          failures.push(`${relative}: unaudited glob`)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  entries.forEach(file => inspect(file))
  return { entries: entries.length, checked: seen.size, failures }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkComponentBoundaries()
  if (result.failures.length) {
    console.error(result.failures.join('\n'))
    process.exitCode = 1
  } else {
    console.log(`Public component closure: ${result.entries} entries, ${result.checked} files, 0 private dependencies`)
  }
}
