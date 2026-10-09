import { useCallback, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { MaDialog, useMaConfirm } from '@/components/ma-dialog'
import type { MaProTableExpose } from '@/components/ma-pro-table'
import { Button } from '@/components/reui/primitives/button'
import { useToast } from '@/components/reui/use-toast'
import { usePermission } from '@/hooks/auth/use-permission'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { PermissionGate } from '@/provider/access/permission-gate'
import { createApi as createRoleApi, type RoleVo } from '../api/role'
import { RoleFormDialog, type RoleFormDialogHandle } from './components/RoleFormDialog'
import { RolePermissionsDialog, type RolePermissionsDialogHandle } from './components/RolePermissionsDialog'
import RoleProTable from './components/RoleProTable'

export default function PermissionRolePageView() {
  const tx = useTextTranslator('base.permission.role.ui')
  useLocaleRevision()
  const { deleteByIds } = useRuntimeFactory(createRoleApi)
  const { toast } = useToast()
  const { hasAuth } = usePermission()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const tableRef = useRef<MaProTableExpose<RoleVo>>(null)
  const editorRef = useRef<RoleFormDialogHandle>(null)
  const permissionsRef = useRef<RolePermissionsDialogHandle>(null)

  const clearSelection = useCallback(() => {
    setSelectedIds([])
    tableRef.current?.getTableRef()?.clearSelection()
  }, [])
  const handleSelectionChange = useCallback((rows: RoleVo[]) => {
    setSelectedIds(rows.flatMap(row => (row.id ? [row.id] : [])))
  }, [])

  const confirm = useMaConfirm({
    onError: error => toast.error(error instanceof Error ? error.message : tx('角色删除失败')),
  })
  const openCreate = () => editorRef.current?.open(null)

  useHeaderActions(
    <PermissionGate permission="permission:role:save">
      <Button onClick={openCreate}>
        <Plus aria-hidden="true" />
        {tx('新增角色')}
      </Button>
    </PermissionGate>,
  )

  async function removeRoles(ids: number[]) {
    if (!ids.length || !hasAuth('permission:role:delete')) return
    confirm.open({
      title: tx('删除角色'),
      description: tx('确认删除 {0} 个角色吗？', { '0': ids.length }),
      onConfirm: async () => {
        if (!hasAuth('permission:role:delete')) return false
        const response = await deleteByIds(ids)
        if (response.data.code !== 200) throw new Error(response.data.message || tx('操作失败'))
        toast.success(tx('角色删除成功'))
        clearSelection()
      },
    })
  }

  return (
    <>
      <RoleProTable
        tableRef={tableRef}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onCreate={openCreate}
        onEdit={role => editorRef.current?.open(role)}
        onPermissions={role => permissionsRef.current?.open(role)}
        onDelete={removeRoles}
      />
      <RoleFormDialog ref={editorRef} onSaved={clearSelection} />
      <RolePermissionsDialog ref={permissionsRef} />
      <MaDialog {...confirm.dialogProps} cancelText={tx('取消')} />
    </>
  )
}
