import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { projectRoot, listPublicFiles, isPublicFile } from './public-files.mjs'
const config = ts.readConfigFile(path.join(projectRoot, 'tsconfig.json'), ts.sys.readFile)
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, projectRoot)
const failures = []
const files = listPublicFiles().filter(file => file.startsWith('src/') && /\.tsx?$/.test(file))
for (const file of files) {
  const absolute = path.join(projectRoot, file)
  const source = ts.createSourceFile(absolute, readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true)
  const resolve = specifier => {
    if (specifier.startsWith('@/assets/') && specifier.endsWith('.css')) {
      const asset = specifier.replace('@/', 'src/')
      if (!isPublicFile(asset) || !existsSync(path.join(projectRoot, asset)))
        failures.push(`${file}: invalid asset ${specifier}`)
      return
    }
    if (
      file.startsWith('src/services/') &&
      (specifier === 'react' ||
        specifier.startsWith('@/provider/') ||
        specifier.startsWith('@/store/') ||
        specifier.startsWith('@/modules/'))
    )
      failures.push(`${file}: service depends on application: ${specifier}`)
    const resolved = ts.resolveModuleName(specifier, absolute, options, ts.sys).resolvedModule
    if (resolved?.isExternalLibraryImport) return
    if (!resolved) {
      failures.push(`${file}: unresolved ${specifier}`)
      return
    }
    const relative = path.relative(projectRoot, resolved.resolvedFileName).split(path.sep).join('/')
    if (!isPublicFile(relative)) failures.push(`${file} -> ${relative}`)
  }
  const visit = node => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      resolve(node.moduleSpecifier.text)
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal))
      resolve(node.argument.literal.text)
    if (ts.isCallExpression(node)) {
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')
      ) {
        if (ts.isStringLiteral(node.arguments[0])) resolve(node.arguments[0].text)
        else failures.push(`${file}: computed import`)
      }
      if (node.expression.getText(source).startsWith('import.meta.glob')) {
        const patterns = ts.isArrayLiteralExpression(node.arguments[0])
          ? node.arguments[0].elements
          : [node.arguments[0]]
        for (const pattern of patterns) {
          if (!ts.isStringLiteral(pattern)) {
            failures.push(`${file}: computed glob`)
            continue
          }
          const raw = pattern.text.replace(/^!/, '')
          const prefix = raw.split(/[*{]/)[0]
          const location = path
            .relative(
              projectRoot,
              raw.startsWith('/src/') ? path.join(projectRoot, prefix) : path.resolve(path.dirname(absolute), prefix),
            )
            .split(path.sep)
            .join('/')
          if (!isPublicFile(`${location.replace(/\/$/, '')}/index.ts`)) failures.push(`${file}: private glob ${raw}`)
        }
      }
      if (ts.isIdentifier(node.expression) && node.expression.text === 'eval')
        failures.push(`${file}: eval is forbidden`)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else console.log(`Core boundaries: ${files.length} public source files, 0 private imports`)
