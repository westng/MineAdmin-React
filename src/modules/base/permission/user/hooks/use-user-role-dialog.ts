import { useMaFormDialog } from '@/components/ma-dialog'
import type { MaFormItem } from '@/components/ma-form'
import { hasAuth } from '@/hooks/framework/use-permission'
import { useMessage } from '@/hooks/framework/use-message'
import { page as pageRoles, type RoleVo } from '@/modules/base/permission/role/api/role'
import { createTextTranslator } from '@/provider/i18n'
import { extractList } from '@/utils/api-data'
import { getUserRole, setUserRole, type UserVo } from '../api/user'
import { assertUserResponse } from '../views/data/form-values'

const tx = createTextTranslator('base.permission.user.ui')
type RoleForm = { roleCodes: string[]; roles: RoleVo[] }

export function useUserRoleDialog() {
  const message = useMessage()
  const editor = useMaFormDialog<RoleForm, UserVo>({
    defaultValues: () => ({ roleCodes: [], roles: [] }),
    canSubmit: () => hasAuth('permission:user:setRole'),
    loadValues: async user => {
      if (!user.id) throw new Error(tx('操作失败'))
      const [roles, selected] = await Promise.all([pageRoles({}), getUserRole(user.id)])
      assertUserResponse(roles)
      assertUserResponse(selected)
      return {
        roles: extractList<RoleVo>(roles.data.data),
        roleCodes: extractList<{ code: string }>(selected.data.data).map(role => role.code),
      }
    },
    onSubmit: async (values, user) => {
      if (!user.id) return false
      assertUserResponse(await setUserRole(user.id, values.roleCodes))
    },
    onSuccess: () => message.success(tx('用户角色更新成功')),
    onError: error => message.error(error instanceof Error ? error.message : tx('角色信息加载失败')),
  })
  const items: MaFormItem<RoleForm>[] = [
    {
      prop: 'roleCodes',
      label: tx('角色'),
      render: 'Select',
      renderProps: {
        multiple: true,
        options: editor.values.roles.flatMap(role =>
          role.code ? [{ value: role.code, label: `${role.name}（${role.code}）` }] : [],
        ),
      },
    },
  ]
  return { ...editor, items }
}
