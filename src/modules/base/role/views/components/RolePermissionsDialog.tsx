import { useImperativeHandle, type Ref } from 'react'
import { MaDialog, useMaFormDialog } from '@/components/ma-dialog'
import { MaForm } from '@/components/ma-form'
import { usePermission } from '@/hooks/auth/use-permission'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { useMessage } from '@/hooks/ui/use-message'
import { createApi as createMenuApi, type MenuVo } from '@/modules/base/menu/api/menu'
import { extractList } from '@/utils/api-data'
import { createApi as createRoleApi, type RolePermissionVo, type RoleVo } from '../../api/role'
import { getPermissionFormItems, type RolePermissionForm } from '../data/getPermissionFormItems'
import { normalizeMenuTree } from '../data/menu-tree'

export interface RolePermissionsDialogHandle {
  open: (role: RoleVo) => void
}

export function RolePermissionsDialog({ ref }: { ref?: Ref<RolePermissionsDialogHandle> }) {
  const tx = useTextTranslator('base.permission.role.ui')
  useLocaleRevision()
  const { hasAuth } = usePermission()
  const { getRolePermission, setRolePermission } = useRuntimeFactory(createRoleApi)
  const { page: pageMenus } = useRuntimeFactory(createMenuApi)
  const message = useMessage()
  const editor = useMaFormDialog<RolePermissionForm, RoleVo>({
    defaultValues: () => ({ menus: [], permissionNames: [] }),
    canSubmit: () => hasAuth('permission:role:setMenu'),
    loadValues: async role => {
      if (!role.id) throw new Error(tx('操作失败'))
      const [menuResponse, permissionResponse] = await Promise.all([pageMenus(), getRolePermission(role.id)])
      for (const response of [menuResponse, permissionResponse]) {
        if (response.data.code !== 200) throw new Error(response.data.message || tx('权限数据加载失败'))
      }
      return {
        menus: normalizeMenuTree(extractList<MenuVo>(menuResponse.data.data)),
        permissionNames: extractList<RolePermissionVo>(permissionResponse.data.data)
          .map(permission => permission.name)
          .filter(Boolean),
      }
    },
    onSubmit: async (values, role) => {
      if (!role.id) return false
      const response = await setRolePermission(role.id, values.permissionNames)
      if (response.data.code !== 200) throw new Error(response.data.message || tx('操作失败'))
    },
    onSuccess: () => message.success(tx('角色权限更新成功')),
    onError: error => message.error(error instanceof Error ? error.message : tx('操作失败')),
  })
  useImperativeHandle(ref, () => ({ open: editor.open }), [editor.open])

  return (
    <MaDialog
      {...editor.dialogProps}
      title={tx('配置菜单权限')}
      description={`${editor.data?.name || tx('当前角色')} ${tx('可以访问的菜单。')}`}
      okText={tx('保存权限')}
      cancelText={tx('取消')}
      size="lg"
      height={640}
      maxHeight="80dvh"
    >
      {editor.loading && <p role="status">{tx('正在加载权限数据…')}</p>}
      {editor.loadError != null && (
        <p role="alert" className="text-sm text-destructive">
          {tx('权限数据加载失败，请关闭后重试。')}
        </p>
      )}
      {editor.ready && (
        <MaForm
          key={editor.formKey}
          {...editor.formProps}
          items={getPermissionFormItems(Boolean(editor.formProps.options?.disabled))}
        />
      )}
    </MaDialog>
  )
}
