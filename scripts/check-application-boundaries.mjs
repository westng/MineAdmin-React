import { readFileSync, readdirSync } from 'node:fs'
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

/** Reads the working tree, including Git-ignored business and plugin sources. */
export function checkApplicationBoundaries(root = projectRoot) {
  const options = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    baseUrl: root,
    paths: { '@/*': ['src/*'], '$/*': ['src/plugins/*'] },
  }
  const graph = new Map()
  const failures = []
  for (const absolute of sourceFiles(path.join(root, 'src'))) {
    const file = path.relative(root, absolute).split(path.sep).join('/')
    const source = ts.createSourceFile(absolute, readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true)
    const edges = []
    graph.set(file, edges)
    const visit = node => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const bindings = node.importClause?.namedBindings
        const externalViolation = externalDependencyViolation(
          file,
          node.moduleSpecifier.text,
          bindings && ts.isNamedImports(bindings)
            ? bindings.elements.map(item => (item.propertyName ?? item.name).text)
            : bindings
              ? ['*']
              : [],
        )
        if (externalViolation) failures.push(externalViolation)
        const resolved = ts.resolveModuleName(node.moduleSpecifier.text, absolute, options, ts.sys).resolvedModule
        if (resolved && !resolved.isExternalLibraryImport) {
          const target = path.relative(root, resolved.resolvedFileName).split(path.sep).join('/')
          const violation = dependencyViolation(file, target)
          if (violation) failures.push(violation)
          // Page entry points are valid composition targets. Page internals are private.
          if (
            feature(file) &&
            feature(target) &&
            feature(file) !== feature(target) &&
            /\/views\/(?:components|data)\//.test(target)
          )
            failures.push(`${file} -> ${target}: import the feature's public entry instead of its view internals`)
          const clause = ts.isImportDeclaration(node) ? node.importClause : node.exportClause
          const named = clause?.namedBindings ?? clause
          const onlyTypes =
            node.isTypeOnly ||
            clause?.isTypeOnly ||
            (named?.elements?.length && !clause?.name && named.elements.every(item => item.isTypeOnly))
          if (!onlyTypes) edges.push(target)
        } else if (
          !resolved &&
          /^(\.|@\/|\$\/)/.test(node.moduleSpecifier.text) &&
          !/\.(css|svg|png|jpg|webp|json)(\?|$)/.test(node.moduleSpecifier.text)
        ) {
          failures.push(`${file}: unresolved ${node.moduleSpecifier.text}`)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
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
