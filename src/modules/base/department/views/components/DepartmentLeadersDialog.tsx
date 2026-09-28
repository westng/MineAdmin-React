import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { MaProTable, type MaProTableExpose } from '@/components/ma-pro-table'
import { MaDialog, useMaConfirm } from '@/components/ma-dialog'
import { Button } from '@/components/reui/primitives/button'
import type { LeaderRecord } from '../../api/leader'
import { useQueryTable } from '@/hooks/query/use-query-table'
import { usePermission } from '@/hooks/auth/use-permission'
import { useToast } from '@/components/reui/use-toast'
import { createApi as createLeaderApi } from '../../api/leader'
import { createViewData as createDepartmentErrorViewData } from '../data/department-error'
import { DepartmentLeaderPicker } from './DepartmentLeaderPicker'
import { createViewData as createRelatedTableColumnsViewData } from '../data/related-table-columns'

interface Props {
  departmentId: number
  departmentName: string
  onClose: () => void
  onChanged: () => Promise<void>
}

export function DepartmentLeadersDialog({ departmentId, departmentName, onClose, onChanged }: Props) {
  const { getLeaderTableColumns } = useRuntimeFactory(createRelatedTableColumnsViewData)

  const tx = useTextTranslator('base.permission.department.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

  const { departmentErrorMessage } = useRuntimeFactory(createDepartmentErrorViewData)

  const leaderApi = useRuntimeFactory(createLeaderApi)

  const tableRef = useRef<MaProTableExpose<LeaderRecord>>(null)
  const busyRef = useRef(false)
  const [adding, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { toast } = useToast()
  const { hasAuth: canAccess } = usePermission()

  const queryOptions = useCallback(
    (params: Record<string, unknown>) =>
      leaderApi.page.queryOptions({
        dept_id: departmentId,
        page: Number(params.page ?? 1),
        page_size: Number(params.page_size ?? 10),
      }),
    [leaderApi, departmentId],
  )
  const query = useQueryTable<LeaderRecord>(queryOptions)

  async function addLeaders(userIds: number[]) {
    if (busyRef.current || !userIds.length) return
    if (!canAccess('permission:leader:save') || !canAccess('permission:user:index')) {
      toast.error(tx('暂无添加负责人权限，请联系管理员'))
      return
    }
    busyRef.current = true
    setBusy(true)
    try {
      const response = await leaderApi.create({ dept_id: departmentId, user_id: [...new Set(userIds)] })
      if (response.data.code !== 200) throw new Error(response.data.message || tx('负责人添加失败'))
      setPickerOpen(false)
      toast.success(tx('负责人添加成功'))
      tableRef.current?.search()
      await onChanged()
    } catch (error) {
      toast.error(departmentErrorMessage(error, tx('负责人添加失败，请重试')))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const confirm = useMaConfirm({
    onError: error => toast.error(departmentErrorMessage(error, tx('负责人移除失败，请重试'))),
  })
  const busy = adding || Boolean(confirm.dialogProps.loading)
  const canAdd = canAccess('permission:leader:save') && canAccess('permission:user:index')
  const canRemove = canAccess('permission:leader:delete')
  const request = query.request
  const removeLeader = useCallback(
    (leader: LeaderRecord) => {
      if (busy || query.loading || !canAccess('permission:leader:delete')) return
      confirm.open({
        title: tx('移除负责人'),
        description: tx('确认将“{0}”从当前部门负责人中移除吗？', {
          '0': leader.user?.nickname || leader.user?.username || `用户 #${leader.user_id}`,
        }),
        okVariant: 'destructive',
        onConfirm: async () => {
          if (!canAccess('permission:leader:delete')) return false
          const response = await leaderApi.deleteByDoubleKey(departmentId, [leader.user_id])
          if (response.data.code !== 200) throw new Error(response.data.message || tx('负责人移除失败'))
          toast.success(tx('负责人已移除'))
          await tableRef.current?.search()
          await onChanged()
        },
      })
    },
    [busy, query.loading, canAccess, confirm, leaderApi, departmentId, onChanged, toast, tx],
  )
  useEffect(() => {
    tableRef.current?.setTableColumns(getLeaderTableColumns({ canRemove, busy, onRemove: removeLeader }))
  }, [getLeaderTableColumns, canRemove, busy, removeLeader])

  return (
    <MaDialog
      open
      onOpenChange={open => {
        if (!open && !busy) onClose()
      }}
      title={tx('设置负责人')}
      description={`${tx('管理“')}${departmentName}${tx('”的负责人，添加和移除后立即生效。')}`}
      showFullscreenButton={false}
      showCloseButton={!busy}
      contentClassName="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
      footer={false}
    >
      <MaProTable<LeaderRecord>
        ref={tableRef}
        data={query.data}
        loading={query.loading}
        error={query.error}
        schema={{ tableColumns: [] }}
        options={{
          toolbar: true,
          requestOptions: { api: request, requestKey: query.sessionVersion, requestPage: { size: 10 } },
          tableOptions: { pagination: { total: query.total }, rowKey: 'user_id', emptyText: tx('当前部门暂无负责人') },
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
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={busy} onClick={onClose}>
          {tx('关闭')}
        </Button>
      </div>
      {pickerOpen && (
        <DepartmentLeaderPicker
          departmentName={departmentName}
          busy={busy}
          onClose={() => setPickerOpen(false)}
          onAdd={addLeaders}
        />
      )}
      <MaDialog {...confirm.dialogProps} cancelText={tx('取消')} />
    </MaDialog>
  )
}
