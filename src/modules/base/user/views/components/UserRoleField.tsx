import type { MaFormRenderContext } from '@/components/ma-form'
import { MaRemoteSelect } from '@/components/ma-remote-select'
import type { RoleVo } from '@/modules/base/role/api/role'
import type { RoleForm } from '../data/getRoleFormItems'

export function UserRoleField({ item, value, setValue }: MaFormRenderContext<RoleForm>) {
  return (
    <MaRemoteSelect<RoleVo>
      url="/admin/role/list"
      multiple
      searchParam="name"
      pageSize={20}
      id="roleCodes"
      aria-label={typeof item.label === 'string' ? item.label : '角色'}
      disabled={Boolean(item.renderProps?.disabled)}
      echo={{ valueParam: 'code', params: { page_size: 50 } }}
      fieldNames={{ value: 'code', label: 'name' }}
      value={Array.isArray(value) ? value : []}
      onChange={next => setValue((Array.isArray(next) ? next : []).map(String))}
      renderOption={role => `${role.name || role.code}（${role.code}）`}
    />
  )
}
