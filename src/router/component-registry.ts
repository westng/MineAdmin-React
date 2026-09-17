import type { ComponentType } from 'react'
import { lazyView } from './lazy-view'

type ViewImporter = () => Promise<{ default?: ComponentType }>

const moduleViews = import.meta.glob('../modules/**/views/**/*.{tsx,jsx}', {
  eager: false,
}) as Record<string, ViewImporter>
const pluginViews = import.meta.glob('../plugins/**/views/**/*.{tsx,jsx}', {
  eager: false,
}) as Record<string, ViewImporter>

const legacyViewAliases: Record<string, string> = {
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
  'base/views/log/userLogin': 'base/permission/log/views/userLogin',
  'base/views/log/userOperation': 'base/permission/log/views/userOperation',
  'base/views/dataCenter/attachment/index': 'base/data-center/attachment/views/index',
  'feishu/views/index': 'feishu/connection/views/index',
  'west/importExportPro/views/index': 'plugins/west/importExportPro/views/ImportExportTaskPage',
  'fastflow': 'plugins/west/workflow/views/index',
  'visboard': 'plugins/west/visboard/views/index',
}

function normalize(value: string) {
  return value
    .replace(/^@\//, '')
    .replace(/^\//, '')
    .replace(/\.(tsx|jsx)$/, '')
    .replace(/\\/g, '/')
}

const resolvedViews = new Map<string, ComponentType>()
const viewEntries = Object.entries({ ...moduleViews, ...pluginViews })

export function resolveView(component?: string): ComponentType | null {
  if (!component) return null
  const normalizedTarget = normalize(component)
  const target = legacyViewAliases[normalizedTarget] || normalizedTarget
  for (const [file, importer] of viewEntries) {
    const normalizedFile = normalize(file)
    const legacyPluginFile = normalizedFile.replace('/web/', '/')
    if ([normalizedFile, legacyPluginFile].some(candidate => candidate.endsWith(`/${target}`) || candidate === target)) {
      const cached = resolvedViews.get(file)
      if (cached) return cached
      const view = lazyView(importer, target)
      resolvedViews.set(file, view)
      return view
    }
  }
  return null
}
