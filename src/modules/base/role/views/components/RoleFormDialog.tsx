import { useImperativeHandle, type Ref } from 'react'
import { MaDialog, useMaFormDialog } from '@/components/ma-dialog'
import { MaForm } from '@/components/ma-form'
import { useToast } from '@/components/reui/use-toast'
import { usePermission } from '@/hooks/auth/use-permission'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createRoleApi, type RoleVo } from '../../api/role'
import { getFormItems, toRoleForm, type RoleForm } from '../data/getFormItems'

export interface RoleFormDialogHandle {
  open: (role: RoleVo | null) => void
}

export function RoleFormDialog({
  ref,
  onSaved,
}: {
  ref?: Ref<RoleFormDialogHandle>
  onSaved: () => void | Promise<void>
}) {
  const tx = useTextTranslator('base.permission.role.ui')
  useLocaleRevision()
  const { create, save } = useRuntimeFactory(createRoleApi)
  const { hasAuth } = usePermission()
  const { toast } = useToast()

  const editor = useMaFormDialog<RoleForm, RoleVo | null>({
    defaultValues: () => toRoleForm(null),
    toValues: toRoleForm,
    canSubmit: role => hasAuth(role?.id ? 'permission:role:update' : 'permission:role:save'),
    formOptions: { layout: 'grid', grid: { columns: 2, gap: '1rem' } },
    onSubmit: async (values, role) => {
      const response = role?.id ? await save(role.id, values) : await create(values)
      if (response.data.code !== 200) throw new Error(response.data.message || tx('操作失败'))
    },
    onSuccess: async (_values, role) => {
      toast.success(role?.id ? tx('角色更新成功') : tx('角色创建成功'))
      await onSaved()
    },
    onError: error => toast.error(error instanceof Error ? error.message : tx('角色保存失败')),
  })

  useImperativeHandle(ref, () => ({ open: editor.open }), [editor.open])

  return (
    <MaDialog
      {...editor.dialogProps}
      title={editor.data?.id ? tx('编辑角色') : tx('新增角色')}
      description={tx('角色编码用于权限识别，保存后可继续配置菜单权限。')}
      okText={tx('保存')}
      cancelText={tx('取消')}
      showFullscreenButton={false}
      contentClassName="sm:max-w-xl"
    >
      <MaForm key={editor.formKey} {...editor.formProps} items={getFormItems(tx, Boolean(editor.data?.id))} />
    </MaDialog>
  )
}
