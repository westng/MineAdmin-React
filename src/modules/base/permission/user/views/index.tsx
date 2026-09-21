import { useCallback, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { MaDialog, useMaConfirm } from '@/components/ma-dialog'
import { MaForm } from '@/components/ma-form'
import type { MaProTableExpose } from '@/components/ma-pro-table'
import { Button } from '@/components/reui/primitives/button'
import { useMessage } from '@/hooks/framework/use-message'
import { PermissionGate, hasAuth, usePermission } from '@/hooks/framework/use-permission'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { useDictStore } from '@/provider/dictionary'
import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { deleteUsers, resetPassword, type UserVo } from '../api/user'
import { useUserQueries } from '../hooks/use-user-queries'
import { useUserFormDialog } from '../hooks/use-user-form-dialog'
import { useUserRoleDialog } from '../hooks/use-user-role-dialog'
import UserProTable from './components/UserProTable'
import { assertUserResponse } from './data/form-values'

const tx = createTextTranslator('base.permission.user.ui')

export default function PermissionUserPageView() {
  useLocaleRevision()
  usePermission()
  const message = useMessage()
  const { invalidate } = useUserQueries()
  const dictionary = useDictStore(state => state.t)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const tableRef = useRef<MaProTableExpose<UserVo>>(null)
  const refreshUsers = useCallback(async () => {
    await invalidate()
    setSelectedIds([])
    tableRef.current?.getTableRef()?.clearSelection()
    await tableRef.current?.refresh()
  }, [invalidate])
  const editor = useUserFormDialog(refreshUsers)
  const roles = useUserRoleDialog()
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
      <Button type="button" onClick={() => editor.open(null)}>
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
        onRefresh={refreshUsers}
        onCreate={() => editor.open(null)}
        onEdit={editor.open}
        onOpenRoles={roles.open}
        onInitializePassword={initializePassword}
        onDelete={removeUsers}
      />
      <MaDialog
        {...editor.dialogProps}
        title={editor.data?.id ? tx('编辑用户') : tx('新增用户')}
        description={tx('填写用户基本信息、组织归属和数据权限，保存后立即生效。')}
        okText={tx('保存')}
        cancelText={tx('取消')}
        size="xl"
      >
        <MaForm key={editor.formKey} {...editor.formProps} items={editor.items} />
      </MaDialog>
      <MaDialog
        {...roles.dialogProps}
        title={tx('设置用户角色')}
        description={`${roles.data?.username || tx('当前用户')} ${tx('可分配的角色。')}`}
        okText={tx('保存角色')}
        cancelText={tx('取消')}
        showFullscreenButton={false}
      >
        {roles.loading && <p role="status">{tx('正在加载角色信息…')}</p>}
        {roles.loadError != null && <p role="alert">{tx('角色信息加载失败，请关闭后重试。')}</p>}
        {roles.ready && !roles.values.roles.length && <p>{tx('暂无可分配角色。')}</p>}
        <MaForm key={roles.formKey} {...roles.formProps} items={roles.items} />
      </MaDialog>
      <MaDialog {...confirm.dialogProps} cancelText={tx('取消')} />
    </>
  )
}
