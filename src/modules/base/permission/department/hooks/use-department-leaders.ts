import { createTextTranslator } from '@/provider/i18n'
import { useCallback, useRef, useState } from 'react'
import type { MaProTableExpose } from '@/components/ma-pro-table'
import { useToast } from '@/components/reui/use-toast'
import { hasAuth, usePermission } from '@/hooks/framework/use-permission'
import * as leaderApi from '../api/leader'
import type { LeaderRecord } from '../api/leader'
import { departmentErrorMessage } from '../views/data/department-error'

const tx = createTextTranslator('base.permission.department.ui')

export function useDepartmentLeaders(departmentId: number, onChanged: () => Promise<void>) {
  const tableRef = useRef<MaProTableExpose<LeaderRecord>>(null)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<LeaderRecord | null>(null)
  const { toast } = useToast()
  const { hasAuth: canAccess } = usePermission()

  const request = useCallback(
    async (params: Record<string, unknown>) => {
      if (!hasAuth('permission:leader:index')) throw new Error(tx('暂无查看负责人权限，请联系管理员'))
      try {
        const response = await leaderApi.page({
          dept_id: departmentId,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 10),
        })
        if (response.data.code !== 200) throw new Error(response.data.message || tx('负责人列表加载失败'))
        return response
      } catch (error) {
        throw new Error(departmentErrorMessage(error, tx('负责人列表加载失败，请重试')), { cause: error })
      }
    },
    [departmentId],
  )

  async function addLeaders(userIds: number[]) {
    if (busyRef.current || !userIds.length) return
    if (!hasAuth('permission:leader:save') || !hasAuth('permission:user:index')) {
      toast(tx('暂无添加负责人权限，请联系管理员'), 'destructive')
      return
    }
    busyRef.current = true
    setBusy(true)
    try {
      const response = await leaderApi.create({ dept_id: departmentId, user_id: [...new Set(userIds)] })
      if (response.data.code !== 200) throw new Error(response.data.message || tx('负责人添加失败'))
      setPickerOpen(false)
      toast(tx('负责人添加成功'), 'success')
      tableRef.current?.search()
      await onChanged()
    } catch (error) {
      toast(departmentErrorMessage(error, tx('负责人添加失败，请重试')), 'destructive')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function removeLeader(leader: LeaderRecord) {
    if (busyRef.current || tableRef.current?.getElTableStates().loading) return
    if (!hasAuth('permission:leader:delete')) {
      toast(tx('暂无移除负责人权限，请联系管理员'), 'destructive')
      return
    }
    setPendingDelete(leader)
  }

  async function confirmRemoveLeader() {
    const leader = pendingDelete
    if (!leader) return
    busyRef.current = true
    setBusy(true)
    try {
      const response = await leaderApi.deleteByDoubleKey(departmentId, [leader.user_id])
      if (response.data.code !== 200) throw new Error(response.data.message || tx('负责人移除失败'))
      toast(tx('负责人已移除'), 'success')
      setPendingDelete(null)
      tableRef.current?.search()
      await onChanged()
    } catch (error) {
      toast(departmentErrorMessage(error, tx('负责人移除失败，请重试')), 'destructive')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return {
    tableRef,
    request,
    busy,
    pickerOpen,
    setPickerOpen,
    addLeaders,
    removeLeader,
    pendingDelete,
    setPendingDelete,
    confirmRemoveLeader,
    canAdd: canAccess('permission:leader:save') && canAccess('permission:user:index'),
    canRemove: canAccess('permission:leader:delete'),
  }
}
