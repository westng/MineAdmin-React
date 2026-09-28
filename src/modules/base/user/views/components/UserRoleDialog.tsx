import { useImperativeHandle, type Ref } from 'react'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createRoleApi } from '@/modules/base/role/api/role'
import { createApi as createUserApi } from '@/modules/base/user/api/user'
import { MaDialog, useMaFormDialog } from '@/components/ma-dialog'
import { MaForm } from '@/components/ma-form'
import { usePermission } from '@/hooks/auth/use-permission'
import { useMessage } from '@/hooks/ui/use-message'
import { type RoleVo } from '@/modules/base/role/api/role'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { extractList } from '@/utils/api-data'
import { type UserVo } from '../../api/user'
import { createViewData as createFormValuesViewData } from '../data/form-values'
import { getRoleFormItems, type RoleForm } from '../data/getRoleFormItems'

export interface UserRoleDialogHandle {
  open: (user: UserVo) => void
}

export function UserRoleDialog({ ref }: { ref?: Ref<UserRoleDialogHandle> }) {
  const { assertUserResponse } = useRuntimeFactory(createFormValuesViewData)

  const tx = useTextTranslator('base.permission.user.ui')

  const { hasAuth } = usePermission()
  const { page: pageRoles } = useRuntimeFactory(createRoleApi)
  const { getUserRole, setUserRole } = useRuntimeFactory(createUserApi)

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
  useImperativeHandle(ref, () => ({ open: editor.open }), [editor.open])
  return (
    <MaDialog
      {...editor.dialogProps}
      title={tx('设置用户角色')}
      description={`${editor.data?.username || tx('当前用户')} ${tx('可分配的角色。')}`}
      okText={tx('保存角色')}
      cancelText={tx('取消')}
      showFullscreenButton={false}
    >
      {editor.loading && <p role="status">{tx('正在加载角色信息…')}</p>}
      {editor.loadError != null && <p role="alert">{tx('角色信息加载失败，请关闭后重试。')}</p>}
      {editor.ready && !editor.values.roles.length && <p>{tx('暂无可分配角色。')}</p>}
      <MaForm key={editor.formKey} {...editor.formProps} items={getRoleFormItems(tx, editor.values.roles)} />
    </MaDialog>
  )
}
