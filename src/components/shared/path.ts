export function getPathValue(source: unknown, path: string | undefined): unknown {
  if (!path) return undefined
  return path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object' && key in value) return (value as Record<string, unknown>)[key]
    return undefined
  }, source)
}
