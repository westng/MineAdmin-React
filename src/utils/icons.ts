const svgModules = import.meta.glob<string>('/src/assets/icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const customIconUrls: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(svgModules).map(([path, url]) => [path.split('/').pop()!.slice(0, -4), url]),
)

export function normalizeIconName(name: string) {
  const value = name.trim()
  return value.startsWith('i-') && value.includes(':') ? value.slice(2) : value
}
