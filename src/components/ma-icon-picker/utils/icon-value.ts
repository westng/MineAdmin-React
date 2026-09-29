export function getIconValue(prefix: string, name: string) {
  return prefix === 'custom' ? name : `${prefix}:${name}`
}
