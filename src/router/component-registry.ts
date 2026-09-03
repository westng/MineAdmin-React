import type { ComponentType } from 'react'

type ViewModule = { default?: ComponentType }

const moduleViews = import.meta.glob('../modules/**/views/**/*.{tsx,jsx}', {
  eager: true,
}) as Record<string, ViewModule>
const pluginViews = import.meta.glob('../plugins/**/views/**/*.{tsx,jsx}', {
  eager: true,
}) as Record<string, ViewModule>

function normalize(value: string) {
  return value
    .replace(/^@\//, '')
    .replace(/^\//, '')
    .replace(/\.(tsx|jsx)$/, '')
    .replace(/\\/g, '/')
}

export function resolveView(component?: string): ComponentType | null {
  if (!component) return null
  const target = normalize(component)
  const candidates = Object.entries({ ...moduleViews, ...pluginViews })
  for (const [file, module] of candidates) {
    const normalizedFile = normalize(file)
    if (normalizedFile.endsWith(`/${target}`) || normalizedFile === target) {
      return module.default ?? null
    }
  }
  return null
}
