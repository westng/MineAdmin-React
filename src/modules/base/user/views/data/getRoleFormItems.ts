import type { MaFormItem } from '@/components/ma-form'
import type { RoleVo } from '@/modules/base/role/api/role'
import type { TextTranslator } from '@/services/i18n/translator'

export type RoleForm = { roleCodes: string[]; roles: RoleVo[] }

export function getRoleFormItems(tx: TextTranslator, roles: RoleVo[]): MaFormItem<RoleForm>[] {
  return [
    {
      prop: 'roleCodes',
      label: tx('角色'),
      render: 'Select',
      renderProps: {
        multiple: true,
        options: roles.flatMap(role =>
          role.code ? [{ value: role.code, label: `${role.name}（${role.code}）` }] : [],
        ),
      },
    },
  ]
}
