import type { MaFormItem } from '@/components/ma-form'
import type { MenuVo } from '@/modules/base/menu/api/menu'
import { PermissionMenuTree } from '../components/PermissionMenuTree'

export type RolePermissionForm = {
  menus: MenuVo[]
  permissionNames: string[]
}

export function getPermissionFormItems(disabled = false): MaFormItem<RolePermissionForm>[] {
  return [
    {
      prop: 'permissionNames',
      showLabel: false,
      render: ({ formData, setValue }) => (
        <PermissionMenuTree
          menus={formData.menus}
          permissionNames={formData.permissionNames}
          onChange={setValue}
          disabled={disabled}
        />
      ),
    },
  ]
}
