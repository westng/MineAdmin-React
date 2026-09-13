import { useCallback, useRef, useState } from 'react'
import { MaProTable, type MaProTableExpose } from '@/components/ma-pro-table'
import { useToast } from '@/components/common/use-toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { hasAuth } from '@/hooks/usePermission'
import { pageUsers, type UserVo } from '../../user/api/user'
import { departmentErrorMessage } from '../utils/department-error'
import { getLeaderPickerTableColumns } from './data/getTableColumns'

interface Props {
  departmentName: string
  busy: boolean
  onClose: () => void
  onAdd: (userIds: number[]) => Promise<void>
}

export function DepartmentLeaderPicker({ departmentName, busy, onClose, onAdd }: Props) {
  const tableRef = useRef<MaProTableExpose<UserVo>>(null)
  const requestSequence = useRef(0)
  const [pending, setPending] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { toast } = useToast()
  const onSelectionChange = useCallback((rows: UserVo[]) => {
    setSelectedIds(rows.flatMap(row => row.id && row.status === 1 ? [row.id] : []))
  }, [])

  const request = useCallback(async (params: Record<string, unknown>) => {
    const sequence = ++requestSequence.current
    setPending(true)
    tableRef.current?.getTableRef()?.clearSelection()
    setSelectedIds([])
    try {
      if (!hasAuth('permission:user:index')) throw new Error('暂无查看用户权限，请联系管理员')
      const response = await pageUsers({
        page: Number(params.page ?? 1), page_size: Number(params.page_size ?? 10), status: 1,
        username: typeof params.username === 'string' ? params.username.trim() : undefined,
        nickname: typeof params.nickname === 'string' ? params.nickname.trim() : undefined,
      })
      if (response.data.code !== 200) throw new Error(response.data.message || '用户列表加载失败')
      return response
    }
    catch (error) {
      throw new Error(departmentErrorMessage(error, '用户列表加载失败，请重试'), { cause: error })
    }
    finally {
      if (sequence === requestSequence.current) {
        tableRef.current?.getTableRef()?.clearSelection()
        setSelectedIds([])
        setPending(false)
      }
    }
  }, [])

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl" showCloseButton={!busy}>
      <DialogHeader>
        <DialogTitle>添加负责人</DialogTitle>
        <DialogDescription>为“{departmentName}”选择已启用的用户，可在当前页多选后添加。</DialogDescription>
      </DialogHeader>
      <MaProTable<UserVo>
        ref={tableRef}
        schema={{
          tableColumns: getLeaderPickerTableColumns(),
          searchItems: [
            { prop: 'username', label: '用户名', render: 'Input' },
            { prop: 'nickname', label: '昵称', render: 'Input' },
          ],
        }}
        options={{
          toolbar: true,
          searchOptions: { defaultValue: { username: '', nickname: '' }, foldButtonShow: false, cols: { xs: 1, sm: 2 } },
          onSearchReset: () => { toast('筛选条件已重置') },
          requestOptions: { api: request, requestPage: { size: 10 } },
          tableOptions: { rowKey: 'id', emptyText: '暂无符合条件的启用用户' },
        }}
        toolbarLeft={<span className="text-sm text-muted-foreground" aria-live="polite">已选择 {selectedIds.length} 人</span>}
        onSelectionChange={onSelectionChange}
      />
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={onClose}>取消</Button>
        <Button disabled={busy || pending || !selectedIds.length} onClick={() => {
          if (!pending && !tableRef.current?.getElTableStates().loading) void onAdd(selectedIds)
        }}>{busy ? '添加中…' : '添加所选负责人'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
