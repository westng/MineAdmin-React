/** React Router paths are case-insensitive; parameter names do not change their matching domain. */
export const routePathKey = (path: string) =>
  (`/${path}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/').toLowerCase().replace(/:[\w-]+(?=\/|\?|$)/g, ':param')

/** Determine whether two segment patterns can match at least one common pathname. */
export function routePatternsOverlap(left: string, right: string): boolean {
  const segments = (path: string) =>
    routePathKey(path)
      .split('/')
      .filter(Boolean)
      .map(segment => ({
        value: segment.replace(/\?$/, ''),
        optional: segment.endsWith('?'),
      }))
  const a = segments(left)
  const b = segments(right)
  const memo = new Map<string, boolean>()
  const visit = (i: number, j: number): boolean => {
    const key = `${i}:${j}`
    const cached = memo.get(key)
    if (cached !== undefined) return cached
    if (i === a.length) return b.slice(j).every(segment => segment.optional || segment.value === '*')
    if (j === b.length) return a.slice(i).every(segment => segment.optional || segment.value === '*')
    const x = a[i]
    const y = b[j]
    const overlaps =
      x.value === '*' ||
      y.value === '*' ||
      (x.optional && visit(i + 1, j)) ||
      (y.optional && visit(i, j + 1)) ||
      ((x.value === y.value || x.value === ':param' || y.value === ':param') && visit(i + 1, j + 1))
    memo.set(key, overlaps)
    return overlaps
  }
  return visit(0, 0)
}

export function isValidRoutePattern(path: string) {
  const segments = path.split('/').filter(Boolean)
  return segments.every(
    (segment, index) =>
      (!segment.includes('?') || /^[^?]+\?$/.test(segment)) &&
      (!segment.includes('*') || (segment === '*' && index === segments.length - 1)),
  )
}
