import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { dependencyViolation, externalDependencyViolation, findDependencyCycles } from './check-dependency-graph.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const feature = file =>
  file.match(/^(src\/modules\/.+?)\/(?:api|hooks|views|locales)\//)?.[1] ??
  file.match(/^(src\/modules\/.+)\/(?:index|register-[^/]+)\.ts$/)?.[1] ??
  file.match(/^(src\/plugins\/[^/]+\/[^/]+)\//)?.[1]
const sourceFiles = root =>
  readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(root, entry.name)
    return entry.isDirectory()
      ? sourceFiles(file)
      : /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')
        ? [file]
        : []
  })

function moduleReference(node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return node.moduleSpecifier
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) return node.arguments[0]
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) return node.argument.literal
}

function importedNames(node) {
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause
    if (!clause) return []
    return [
      ...(clause.name ? ['default'] : []),
      ...(clause.namedBindings && ts.isNamedImports(clause.namedBindings)
        ? clause.namedBindings.elements.map(item => (item.propertyName ?? item.name).text)
        : clause.namedBindings
          ? ['*']
          : []),
    ]
  }
  if (ts.isExportDeclaration(node))
    return node.exportClause && ts.isNamedExports(node.exportClause)
      ? node.exportClause.elements.map(item => (item.propertyName ?? item.name).text)
      : ['*']
  if (ts.isImportTypeNode(node) && node.qualifier) {
    let qualifier = node.qualifier
    while (ts.isQualifiedName(qualifier)) qualifier = qualifier.left
    return [qualifier.text]
  }
  return ['*']
}

/** Reads the working tree, including Git-ignored business and plugin sources. */
export function checkApplicationBoundaries(root = projectRoot) {
  const configFile = path.join(root, 'tsconfig.json')
  const options = existsSync(configFile)
    ? ts.parseJsonConfigFileContent(ts.readConfigFile(configFile, ts.sys.readFile).config, ts.sys, root).options
    : {
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        baseUrl: root,
        paths: { '@/*': ['src/*'], '$/*': ['src/plugins/*'], '~/*': ['src/modules/*'], '#/*': ['src/types/*'] },
      }
  const resolutionCache = ts.createModuleResolutionCache(root, file => file, options)
  const graph = new Map()
  const failures = []
  const publicEntries = new Map()
  const publicConsumers = new Map()
  for (const absolute of sourceFiles(path.join(root, 'src'))) {
    const file = path.relative(root, absolute).split(path.sep).join('/')
    const source = ts.createSourceFile(absolute, readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true)
    const edges = []
    graph.set(file, edges)
    if (file.startsWith('src/modules/') && feature(file) && file === `${feature(file)}/index.ts`) {
      publicEntries.set(
        file,
        source.statements.flatMap(statement =>
          ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)
            ? statement.exportClause.elements.map(item => item.name.text)
            : [],
        ),
      )
    }
    const visit = node => {
      const specifier = moduleReference(node)
      if (specifier && ts.isStringLiteralLike(specifier)) {
        const bindings = node.importClause?.namedBindings
        const externalViolation = externalDependencyViolation(
          file,
          specifier.text,
          bindings && ts.isNamedImports(bindings)
            ? bindings.elements.map(item => (item.propertyName ?? item.name).text)
            : bindings
              ? ['*']
              : [],
        )
        if (externalViolation) failures.push(externalViolation)
        const resolved = ts.resolveModuleName(specifier.text, absolute, options, ts.sys, resolutionCache).resolvedModule
        if (resolved && !resolved.isExternalLibraryImport) {
          const target = path.relative(root, resolved.resolvedFileName).split(path.sep).join('/')
          const violation = dependencyViolation(file, target)
          if (violation) failures.push(violation)
          // Page entry points are valid composition targets. Page internals are private.
          if (feature(target) && feature(file) !== feature(target) && /\/views\/(?:components|data)\//.test(target))
            failures.push(`${file} -> ${target}: import the feature's public entry instead of its view internals`)
          if (
            target.startsWith('src/modules/') &&
            feature(target) &&
            feature(file) !== feature(target) &&
            target === `${feature(target)}/index.ts`
          ) {
            const consumers = publicConsumers.get(target) ?? new Set()
            for (const name of importedNames(node)) consumers.add(name)
            publicConsumers.set(target, consumers)
          }
          const clause = ts.isImportDeclaration(node) ? node.importClause : node.exportClause
          const named = clause?.namedBindings ?? clause
          const onlyTypes =
            ts.isImportTypeNode(node) ||
            node.isTypeOnly ||
            clause?.isTypeOnly ||
            (named?.elements?.length && !clause?.name && named.elements.every(item => item.isTypeOnly))
          // Lazy imports are checked for ownership but do not form eager initialization cycles.
          if (!onlyTypes && !ts.isCallExpression(node)) edges.push(target)
        } else if (
          !resolved &&
          /^(\.|@\/|\$\/|~\/|#\/)/.test(specifier.text) &&
          !/\.(css|svg|png|jpg|webp|json)(\?|$)/.test(specifier.text)
        ) {
          failures.push(`${file}: unresolved ${specifier.text}`)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  for (const [file, names] of publicEntries) {
    const consumers = publicConsumers.get(file) ?? new Set()
    for (const name of names) {
      if (!consumers.has('*') && !consumers.has(name))
        failures.push(`${file}: ${name} has no consumer outside its sub-module; remove it from the public entry`)
    }
  }
  for (const cycle of findDependencyCycles(graph)) failures.push(`Circular runtime dependency: ${cycle.join(' -> ')}`)
  return { files: graph.size, failures }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkApplicationBoundaries()
  if (result.failures.length) {
    console.error(result.failures.join('\n'))
    process.exitCode = 1
  } else
    console.log(`Application dependencies passed: ${result.files} source files, including business modules and plugins`)
}
