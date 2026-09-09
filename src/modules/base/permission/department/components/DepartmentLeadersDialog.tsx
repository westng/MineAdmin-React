import { useEffect, useMemo } from 'react'
import { Plus, UserRoundMinus } from 'lucide-react'
import { MaProTable, type MaProTableColumns } from '@/components/ma-pro-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { LeaderRecord } from '../api/leader'
import { useDepartmentLeaders } from '../hooks/use-department-leaders'
import { DepartmentLeaderPicker } from './DepartmentLeaderPicker'

interface Props {
  departmentId: number
  departmentName: string
  onClose: () => void
  onChanged: () => Promise<void>
}

export function DepartmentLeadersDialog({ departmentId, departmentName, onClose, onChanged }: Props) {
  const { tableRef, request, busy, pickerOpen, setPickerOpen, canAdd, canRemove, addLeaders, removeLeader } = useDepartmentLeaders(departmentId, onChanged)
  const columns = useMemo<MaProTableColumns<LeaderRecord>[]>(() => [
    { label: '用户名', cellRender: ({ row }) => row.user?.username || `用户 #${row.user_id}` },
    { label: '昵称', cellRender: ({ row }) => row.user?.nickname || (row.user ? '-' : '用户已不可用') },
    ...(canRemove ? [{ label: '操作', align: 'right' as const, width: 100, cellRender: ({ row }: { row: LeaderRecord }) =>
      <Button variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={() => void removeLeader(row)}><UserRoundMinus aria-hidden="true" />移除</Button>,
    }] : []),
  ], [busy, canRemove, removeLeader])
  useEffect(() => { tableRef.current?.setTableColumns(columns) }, [columns, tableRef])

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl" showCloseButton={!busy}>
      <DialogHeader>
        <DialogTitle>设置负责人</DialogTitle>
        <DialogDescription>管理“{departmentName}”的负责人，添加和移除后立即生效。</DialogDescription>
      </DialogHeader>
      <MaProTable<LeaderRecord>
        ref={tableRef}
        schema={{ tableColumns: columns }}
        options={{
          toolbar: true,
          requestOptions: { api: request, requestPage: { size: 10 } },
          tableOptions: { rowKey: 'user_id', emptyText: '当前部门暂无负责人' },
        }}
        toolbarLeft={canAdd && <Button size="sm" disabled={busy} onClick={() => setPickerOpen(true)}><Plus aria-hidden="true" />添加负责人</Button>}
      />
      <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>关闭</Button></DialogFooter>
      {pickerOpen && <DepartmentLeaderPicker departmentName={departmentName} busy={busy} onClose={() => setPickerOpen(false)} onAdd={addLeaders} />}
    </DialogContent>
  </Dialog>
}
