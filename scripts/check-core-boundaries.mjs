import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { projectRoot, listPublicFiles, isPublicFile } from './public-files.mjs'
import { dependencyViolation, externalDependencyViolation, findDependencyCycles } from './check-dependency-graph.mjs'
const config = ts.readConfigFile(path.join(projectRoot, 'tsconfig.json'), ts.sys.readFile)
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, projectRoot)
const failures = []
const files = listPublicFiles().filter(file => file.startsWith('src/') && /\.tsx?$/.test(file))
const graph = new Map(files.map(file => [file, []]))
// 允许的运行时 glob：按 Vue 规则查页面文件，以及自动加载插件。
const approvedGlobs = new Map([
  [
    'src/app/runtime/instance.ts',
    new Set([
      '../../modules/**/views/**/*.{tsx,jsx}',
      '../../plugins/**/views/**/*.{tsx,jsx}',
      '!**/views/**/{components,data,hooks,__tests__}/**',
      '!**/*.{test,spec}.{tsx,jsx}',
    ]),
  ],
  ['src/app/bootstrap.ts', new Set(['../plugins/*/*/index.{ts,tsx}'])],
])
for (const file of files) {
  const absolute = path.join(projectRoot, file)
  const source = ts.createSourceFile(absolute, readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true)
  const resolve = (specifier, runtime = false) => {
    if (specifier.startsWith('@/assets/') && specifier.endsWith('.css')) {
      const asset = specifier.replace('@/', 'src/')
      if (!isPublicFile(asset) || !existsSync(path.join(projectRoot, asset)))
        failures.push(`${file}: invalid asset ${specifier}`)
      return
    }
    const resolved = ts.resolveModuleName(specifier, absolute, options, ts.sys).resolvedModule
    if (resolved?.isExternalLibraryImport) {
      if (file.startsWith('src/services/') && /^(react|react-dom)(\/|$)/.test(specifier))
        failures.push(`${file}: service depends on UI: ${specifier}`)
      return
    }
    if (!resolved) {
      failures.push(`${file}: unresolved ${specifier}`)
      return
    }
    const relative = path.relative(projectRoot, resolved.resolvedFileName).split(path.sep).join('/')
    const violation = dependencyViolation(file, relative)
    if (violation) failures.push(violation)
    if (runtime) graph.get(file).push(relative)
    if (!isPublicFile(relative)) failures.push(`${file} -> ${relative}`)
  }
  const visit = node => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const bindings = node.importClause?.namedBindings
      const violation = externalDependencyViolation(
        file,
        node.moduleSpecifier.text,
        bindings && ts.isNamedImports(bindings)
          ? bindings.elements.map(item => (item.propertyName ?? item.name).text)
          : bindings
            ? ['*']
            : [],
      )
      if (violation) failures.push(violation)
      const clause = ts.isImportDeclaration(node) ? node.importClause : node.exportClause
      const onlyTypes =
        node.isTypeOnly ||
        clause?.isTypeOnly ||
        (clause &&
          ts.isNamedExports(clause) &&
          clause.elements.length > 0 &&
          clause.elements.every(item => item.isTypeOnly)) ||
        (clause &&
          !clause.name &&
          clause.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.length > 0 &&
          clause.namedBindings.elements.every(item => item.isTypeOnly))
      resolve(node.moduleSpecifier.text, !onlyTypes)
    }
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
          const approved = approvedGlobs.get(file)?.has(pattern.text)
          if (!isPublicFile(`${location.replace(/\/$/, '')}/index.ts`) && !approved)
            failures.push(`${file}: unapproved glob ${raw}`)
        }
      }
      if (ts.isIdentifier(node.expression) && node.expression.text === 'eval')
        failures.push(`${file}: eval is forbidden`)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}
for (const cycle of findDependencyCycles(graph)) failures.push(`Runtime dependency cycle: ${cycle.join(' -> ')}`)
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else console.log(`Core boundaries: ${files.length} source files checked, 0 forbidden imports`)
