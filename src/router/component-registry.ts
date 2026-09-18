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
  'base/permission/log/views/userLogin': 'base/views/log/userLogin',
  'base/permission/log/views/userOperation': 'base/views/log/userOperation',
  'base/data-center/attachment/views/index': 'base/views/dataCenter/attachment/index',
}
const views = import.meta.glob('../modules/base/**/views/*.tsx') as Record<string, ComponentManifestEntry['load']>
const dispose = componentManifest.register(
  Object.entries(views).map(([path, load]) => {
    const oldId = path.replace('../modules/', '').replace(/\.tsx$/, '')
    const id = oldId.replace('/views/index', '').replace('/views/', '/')
    return { id, load, aliases: [oldId, ...(aliases[oldId] ? [aliases[oldId]] : [])] }
  }),
)
if (import.meta.hot) import.meta.hot.dispose(dispose)
export const resolveView = componentManifest.resolve
