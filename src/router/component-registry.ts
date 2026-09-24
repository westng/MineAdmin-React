import { componentManifest, type ComponentManifestEntry } from './manifest'

const aliases: Record<string, string> = {
  'base/auth/views/index': 'base/views/login/index',
  'base/dashboard/views/index': 'base/views/dashboard/index',
  'base/clinic/views/index': 'base/views/clinic/index',
  'base/dynamic-menu/views/index': 'base/views/dynamic-menu/index',
  'base/user-center/views/index': 'base/views/user-center/index',
  'base/account-settings/views/index': 'base/views/account-settings/index',
  'base/settings/views/index': 'base/views/settings/index',
  'base/permission/department/views/index': 'base/views/permission/department/index',
  'base/permission/menu/views/index': 'base/views/permission/menu/index',
  'base/permission/role/views/index': 'base/views/permission/role/index',
  'base/permission/user/views/index': 'base/views/permission/user/index',
  'base/data-center/attachment/views/index': 'base/views/dataCenter/attachment/index',
}
const views = import.meta.glob('../modules/base/**/views/*.tsx') as Record<string, ComponentManifestEntry['load']>
const logViews: Record<string, ComponentManifestEntry['load']> = {
  '../modules/base/permission/log/views/components/UserLoginLogPage.tsx': () =>
    import('@/modules/base/permission/log/views/components/UserLoginLogPage'),
  '../modules/base/permission/log/views/components/UserOperationLogPage.tsx': () =>
    import('@/modules/base/permission/log/views/components/UserOperationLogPage'),
}
const allViews = { ...views, ...logViews }
const dispose = componentManifest.register(
  Object.entries(allViews).map(([path, load]) => {
    const oldId = path.replace('../modules/', '').replace(/\.tsx$/, '')
    const id = oldId.replace('/views/index', '').replace('/views/', '/')
    const legacyAliases = oldId.endsWith('/components/UserLoginLogPage')
      ? ['base/permission/log/views/userLogin', 'base/views/log/userLogin']
      : oldId.endsWith('/components/UserOperationLogPage')
        ? ['base/permission/log/views/userOperation', 'base/views/log/userOperation']
        : aliases[oldId]
          ? [aliases[oldId]]
          : []
    return { id, load, aliases: [oldId, ...legacyAliases] }
  }),
)
if (import.meta.hot) import.meta.hot.dispose(dispose)
export const resolveView = componentManifest.resolve
