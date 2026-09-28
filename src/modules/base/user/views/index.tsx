import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createUserApi } from '@/modules/base/user/api/user'
import { useCallback, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { MaDialog, useMaConfirm } from '@/components/ma-dialog'
import type { MaProTableExpose } from '@/components/ma-pro-table'
import { Button } from '@/components/reui/primitives/button'
import { useMessage } from '@/hooks/ui/use-message'
import { PermissionGate } from '@/provider/access/permission-gate'
import { usePermission } from '@/hooks/auth/use-permission'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { useDictStore } from '@/hooks/use-dictionary'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { type UserVo } from '../api/user'
import { UserFormDialog, type UserFormDialogHandle } from './components/UserFormDialog'
import { UserRoleDialog, type UserRoleDialogHandle } from './components/UserRoleDialog'
import UserProTable from './components/UserProTable'
import { createViewData as createFormValuesViewData } from './data/form-values'

export default function PermissionUserPageView() {
  const { assertUserResponse } = useRuntimeFactory(createFormValuesViewData)

  const tx = useTextTranslator('base.permission.user.ui')

  const { deleteUsers, resetPassword } = useRuntimeFactory(createUserApi)

  useLocaleRevision()
  const { hasAuth } = usePermission()
  const message = useMessage()
  const dictionary = useDictStore(state => state.t)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const tableRef = useRef<MaProTableExpose<UserVo>>(null)
  const refreshUsers = useCallback(async () => {
    setSelectedIds([])
    tableRef.current?.getTableRef()?.clearSelection()
  }, [])
  const editorRef = useRef<UserFormDialogHandle>(null)
  const rolesRef = useRef<UserRoleDialogHandle>(null)
  const confirm = useMaConfirm({
    onError: error => message.error(error instanceof Error ? error.message : tx('操作失败')),
  })

  function removeUsers(ids: number[]) {
    if (!ids.length || !hasAuth('permission:user:delete')) return
    confirm.open({
      title: tx('删除用户'),
      description: tx('确认删除 {0} 个用户吗？', { '0': ids.length }),
      okText: tx('删除'),
      okVariant: 'destructive',
      onConfirm: async () => {
        if (!hasAuth('permission:user:delete')) return false
        assertUserResponse(await deleteUsers(ids))
        message.success(tx('用户删除成功'))
        await refreshUsers()
      },
    })
  }

  function initializePassword(user: UserVo) {
    if (!user.id || !hasAuth('permission:user:password')) return
    const id = user.id
    confirm.open({
      title: tx('重置用户密码'),
      okVariant: 'destructive',
      description: tx('确认将 {0} 的密码重置为初始密码吗？', { '0': user.username || tx('当前用户') }),
      onConfirm: async () => {
        if (!hasAuth('permission:user:password')) return false
        assertUserResponse(await resetPassword(id))
        message.success(tx('初始密码设置成功'))
      },
    })
  }

  useHeaderActions(
    <PermissionGate permission="permission:user:save">
      <Button type="button" onClick={() => editorRef.current?.open(null)}>
        <Plus aria-hidden="true" />
        {tx('新增用户')}
      </Button>
    </PermissionGate>,
  )

  return (
    <>
      <UserProTable
        proTableRef={tableRef}
        selectedIds={selectedIds}
        getUserTypeLabel={value => String(dictionary('base-userType', String(value)) || tx('普通用户'))}
        getStatusLabel={value => String(dictionary('system-status', String(value)) || tx('未知'))}
        onSelectionChange={rows => setSelectedIds(rows.flatMap(row => (row.id ? [row.id] : [])))}
        onRefresh={async () => {
          await tableRef.current?.refresh()
        }}
        onCreate={() => editorRef.current?.open(null)}
        onEdit={user => editorRef.current?.open(user)}
        onOpenRoles={user => rolesRef.current?.open(user)}
        onInitializePassword={initializePassword}
        onDelete={removeUsers}
      />
      <UserFormDialog ref={editorRef} onSaved={refreshUsers} />
      <UserRoleDialog ref={rolesRef} />
      <MaDialog {...confirm.dialogProps} cancelText={tx('取消')} />
    </>
  )
}
