/** Apply ownership rules after TypeScript has resolved aliases and relative paths. */
export function dependencyViolation(source, target) {
  if (source.startsWith('src/services/') && !/^src\/(services|types)\//.test(target))
    return `${source}: service depends on application: ${target}`
  if (!source.startsWith('src/app/') && target.startsWith('src/app/'))
    return `${source}: only application composition may import app: ${target}`
  if (
    /^src\/store\/[^/]+\/(?:create-store|defaults|colors|types)\.ts$/.test(source) &&
    !/^src\/(?:services|types)\//.test(target) &&
    !/^src\/store\/[^/]+\/(?:create-store|defaults|colors|types)\.ts$/.test(target)
  )
    return `${source}: pure store depends on UI or application composition: ${target}`
  if (source.startsWith('src/provider/') && /^src\/(?:modules|plugins|components\/business)\//.test(target))
    return `${source}: provider depends on business implementation: ${target}`
  if (
    source.startsWith('src/hooks/ui/') &&
    !/^src\/(?:components\/(?:ma-[^/]+|reui)|hooks\/ui|utils|types)\//.test(target)
  )
    return `${source}: UI hook depends on application runtime: ${target}`
  if (/^src\/(router|layouts)\//.test(source) && target.includes('/modules/') && target.includes('/api/'))
    return `${source}: core contract depends on feature API: ${target}`
  return null
}

/** Non-component APIs in Query/Zustand are permitted; React consumers are not. */
export function externalDependencyViolation(source, specifier, bindings = []) {
  const pure =
    source.startsWith('src/services/') || /^src\/store\/[^/]+\/(?:create-store|defaults|colors|types)\.ts$/.test(source)
  if (!pure) return null
  if (
    /^(react|react-dom)(\/|$)/.test(specifier) ||
    (['@tanstack/react-query', 'zustand'].includes(specifier) &&
      bindings.some(name => name === '*' || /^use[A-Z]|Provider$/.test(name)))
  )
    return `${source}: non-component implementation depends on React UI: ${specifier}`
  return null
}

export function findDependencyCycles(graph) {
  let next = 0
  const indices = new Map(),
    low = new Map(),
    stack = [],
    active = new Set(),
    cycles = []
  function visit(node) {
    indices.set(node, next)
    low.set(node, next++)
    stack.push(node)
    active.add(node)
    for (const target of graph.get(node) ?? []) {
      if (!graph.has(target)) continue
      if (!indices.has(target)) {
        visit(target)
        low.set(node, Math.min(low.get(node), low.get(target)))
      } else if (active.has(target)) low.set(node, Math.min(low.get(node), indices.get(target)))
    }
    if (low.get(node) !== indices.get(node)) return
    const group = []
    let member
    do {
      member = stack.pop()
      active.delete(member)
      group.push(member)
    } while (member !== node)
    if (group.length > 1 || graph.get(node)?.includes(node)) cycles.push(group)
  }
  for (const node of graph.keys()) if (!indices.has(node)) visit(node)
  return cycles
}
