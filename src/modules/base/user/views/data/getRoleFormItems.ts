import type { MaFormItem } from '@/components/ma-form'
import type { TextTranslator } from '@/services/i18n/translator'
import { UserRoleField } from '../components/UserRoleField'

export type RoleForm = { roleCodes: string[] }

export function getRoleFormItems(tx: TextTranslator, disabled = false): MaFormItem<RoleForm>[] {
  return [
    {
      prop: 'roleCodes',
      label: tx('角色'),
      render: UserRoleField,
      renderProps: { disabled },
    },
  ]
}
