import type { ComponentType } from 'react'

type ViewModule = { default?: ComponentType }

const moduleViews = import.meta.glob('../modules/**/views/**/*.{tsx,jsx}', {
  eager: true,
}) as Record<string, ViewModule>
const pluginViews = import.meta.glob('../plugins/**/views/**/*.{tsx,jsx}', {
  eager: true,
}) as Record<string, ViewModule>

const legacyBaseViewAliases: Record<string, string> = {
  'base/views/login/index': 'base/auth/views/index',
  'base/views/dashboard/index': 'base/dashboard/views/index',
  'base/views/clinic/index': 'base/clinic/views/index',
  'base/views/dynamic-menu/index': 'base/dynamic-menu/views/index',
  'base/views/user-center/index': 'base/user-center/views/index',
  'base/views/account-settings/index': 'base/account-settings/views/index',
  'base/views/settings/index': 'base/settings/views/index',
  'base/views/permission/department/index': 'base/permission/department/views/index',
  'base/views/permission/menu/index': 'base/permission/menu/views/index',
  'base/views/permission/role/index': 'base/permission/role/views/index',
  'base/views/permission/user/index': 'base/permission/user/views/index',
}

function normalize(value: string) {
  return value
    .replace(/^@\//, '')
    .replace(/^\//, '')
    .replace(/\.(tsx|jsx)$/, '')
    .replace(/\\/g, '/')
}

export function resolveView(component?: string): ComponentType | null {
  if (!component) return null
  const normalizedTarget = normalize(component)
  const target = legacyBaseViewAliases[normalizedTarget] || normalizedTarget
  const candidates = Object.entries({ ...moduleViews, ...pluginViews })
  for (const [file, module] of candidates) {
    const normalizedFile = normalize(file)
    const legacyPluginFile = normalizedFile.replace('/web/', '/')
    if ([normalizedFile, legacyPluginFile].some(candidate => candidate.endsWith(`/${target}`) || candidate === target)) {
      return module.default ?? null
    }
  }
  return null
}
