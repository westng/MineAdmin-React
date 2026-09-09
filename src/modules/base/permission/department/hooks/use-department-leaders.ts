import { useCallback, useRef, useState } from 'react'
import type { MaProTableExpose } from '@/components/ma-pro-table'
import { useToast } from '@/components/common/use-toast'
import { hasAuth, usePermission } from '@/hooks/usePermission'
import * as leaderApi from '../api/leader'
import type { LeaderRecord } from '../api/leader'
import { departmentErrorMessage } from '../utils/department-error'

export function useDepartmentLeaders(departmentId: number, onChanged: () => Promise<void>) {
  const tableRef = useRef<MaProTableExpose<LeaderRecord>>(null)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { toast } = useToast()
  const { hasAuth: canAccess } = usePermission()

  const request = useCallback(async (params: Record<string, unknown>) => {
    if (!hasAuth('permission:leader:index')) throw new Error('暂无查看负责人权限，请联系管理员')
    try {
      const response = await leaderApi.page({
        dept_id: departmentId,
        page: Number(params.page ?? 1),
        page_size: Number(params.page_size ?? 10),
      })
      if (response.data.code !== 200) throw new Error(response.data.message || '负责人列表加载失败')
      return response
    }
    catch (error) {
      throw new Error(departmentErrorMessage(error, '负责人列表加载失败，请重试'), { cause: error })
    }
  }, [departmentId])

  async function addLeaders(userIds: number[]) {
    if (busyRef.current || !userIds.length) return
    if (!hasAuth('permission:leader:save') || !hasAuth('permission:user:index')) {
      toast('暂无添加负责人权限，请联系管理员', 'destructive')
      return
    }
    busyRef.current = true
    setBusy(true)
    try {
      const response = await leaderApi.create({ dept_id: departmentId, user_id: [...new Set(userIds)] })
      if (response.data.code !== 200) throw new Error(response.data.message || '负责人添加失败')
      setPickerOpen(false)
      toast('负责人添加成功', 'success')
      tableRef.current?.search()
      await onChanged()
    }
    catch (error) {
      toast(departmentErrorMessage(error, '负责人添加失败，请重试'), 'destructive')
    }
    finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function removeLeader(leader: LeaderRecord) {
    if (busyRef.current || tableRef.current?.getElTableStates().loading) return
    if (!hasAuth('permission:leader:delete')) {
      toast('暂无移除负责人权限，请联系管理员', 'destructive')
      return
    }
    const name = leader.user?.nickname || leader.user?.username || `用户 #${leader.user_id}`
    if (!window.confirm(`确认将“${name}”从当前部门负责人中移除吗？`)) return
    busyRef.current = true
    setBusy(true)
    try {
      const response = await leaderApi.deleteByDoubleKey(departmentId, [leader.user_id])
      if (response.data.code !== 200) throw new Error(response.data.message || '负责人移除失败')
      toast('负责人已移除', 'success')
      tableRef.current?.search()
      await onChanged()
    }
    catch (error) {
      toast(departmentErrorMessage(error, '负责人移除失败，请重试'), 'destructive')
    }
    finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return {
    tableRef, request, busy, pickerOpen, setPickerOpen, addLeaders, removeLeader,
    canAdd: canAccess('permission:leader:save') && canAccess('permission:user:index'),
    canRemove: canAccess('permission:leader:delete'),
  }
}
