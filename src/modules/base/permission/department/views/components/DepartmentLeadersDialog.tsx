import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { MaProTable } from '@/components/ma-pro-table'
import { Button } from '@/components/reui/primitives/button'
import { ConfirmDialog } from '@/components/reui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/reui/primitives/dialog'
import type { LeaderRecord } from '../../api/leader'
import { useDepartmentLeaders } from '../data/use-department-leaders'
import { DepartmentLeaderPicker } from './DepartmentLeaderPicker'
import { getLeaderTableColumns } from '../data/related-table-columns'

const tx = createTextTranslator('base.permission.department.ui')

interface Props {
  departmentId: number
  departmentName: string
  onClose: () => void
  onChanged: () => Promise<void>
}

export function DepartmentLeadersDialog({ departmentId, departmentName, onClose, onChanged }: Props) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const {
    tableRef,
    request,
    busy,
    pickerOpen,
    setPickerOpen,
    canAdd,
    canRemove,
    addLeaders,
    removeLeader,
    pendingDelete,
    setPendingDelete,
    confirmRemoveLeader,
  } = useDepartmentLeaders(departmentId, onChanged)
  const columns = useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return getLeaderTableColumns({ canRemove, busy, onRemove: row => void removeLeader(row) })
  }, [busy, canRemove, removeLeader, localeRevision])
  useEffect(() => {
    tableRef.current?.setTableColumns(columns)
  }, [columns, tableRef])

  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{tx('设置负责人')}</DialogTitle>
          <DialogDescription>
            {tx('管理“')}
            {departmentName}
            {tx('”的负责人，添加和移除后立即生效。')}
          </DialogDescription>
        </DialogHeader>
        <MaProTable<LeaderRecord>
          ref={tableRef}
          schema={{ tableColumns: columns }}
          options={{
            toolbar: true,
            requestOptions: { api: request, requestPage: { size: 10 } },
            tableOptions: { rowKey: 'user_id', emptyText: tx('当前部门暂无负责人') },
          }}
          toolbarLeft={
            canAdd && (
              <Button size="sm" disabled={busy} onClick={() => setPickerOpen(true)}>
                <Plus aria-hidden="true" />
                {tx('添加负责人')}
              </Button>
            )
          }
        />
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {tx('关闭')}
          </Button>
        </DialogFooter>
        {pickerOpen && (
          <DepartmentLeaderPicker
            departmentName={departmentName}
            busy={busy}
            onClose={() => setPickerOpen(false)}
            onAdd={addLeaders}
          />
        )}
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title={tx('移除负责人')}
          description={tx('确认将“{0}”从当前部门负责人中移除吗？', {
            '0': pendingDelete?.user?.nickname || pendingDelete?.user?.username || `用户 #${pendingDelete?.user_id}`,
          })}
          onClose={() => setPendingDelete(null)}
          onConfirm={confirmRemoveLeader}
        />
      </DialogContent>
    </Dialog>
  )
}
