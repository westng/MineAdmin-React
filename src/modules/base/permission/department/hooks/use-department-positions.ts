import { createTextTranslator } from '@/provider/i18n'
import { useCallback, useRef, useState } from 'react'
import type { MaProTableExpose } from '@/components/ma-pro-table'
import { useToast } from '@/components/reui/use-toast'
import { hasAuth, usePermission } from '@/hooks/framework/use-permission'
import * as positionApi from '../api/position'
import type { PositionVo } from '../api/position'
import { departmentErrorMessage } from '../utils/department-error'

const tx = createTextTranslator('base.permission.department.ui')

type PositionForm = { id?: number; name: string }

export function useDepartmentPositions(departmentId: number, onChanged: () => Promise<void>) {
  const tableRef = useRef<MaProTableExpose<PositionVo>>(null)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<PositionForm | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PositionVo | null>(null)
  const { toast } = useToast()
  const { hasAuth: canAccess } = usePermission()

  const request = useCallback(
    async (params: Record<string, unknown>) => {
      if (!hasAuth('permission:position:index')) throw new Error(tx('暂无查看岗位权限，请联系管理员'))
      try {
        const response = await positionApi.page({
          dept_id: departmentId,
          name: typeof params.name === 'string' ? params.name.trim() : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 10),
        })
        if (response.data.code !== 200) throw new Error(response.data.message || tx('岗位列表加载失败'))
        return response
      } catch (error) {
        throw new Error(departmentErrorMessage(error, tx('岗位列表加载失败，请重试')), { cause: error })
      }
    },
    [departmentId],
  )

  async function savePosition() {
    if (busyRef.current || !form) return
    if (!hasAuth(form.id ? 'permission:position:update' : 'permission:position:save')) {
      toast(tx('暂无保存岗位权限，请联系管理员'), 'destructive')
      return
    }
    const name = form.name.trim()
    if (!name || [...name].length > 50) {
      toast(tx('岗位名称不能为空，且不能超过 50 个字符'), 'warning')
      return
    }
    busyRef.current = true
    setBusy(true)
    try {
      const payload = { dept_id: departmentId, name }
      const response = form.id ? await positionApi.save(form.id, payload) : await positionApi.create(payload)
      if (response.data.code !== 200) throw new Error(response.data.message || tx('岗位保存失败'))
      setForm(null)
      toast(form.id ? tx('岗位更新成功') : tx('岗位创建成功'), 'success')
      tableRef.current?.search()
      await onChanged()
    } catch (error) {
      toast(departmentErrorMessage(error, tx('岗位保存失败，请重试')), 'destructive')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function removePosition(position: PositionVo) {
    if (busyRef.current || !position.id || tableRef.current?.getElTableStates().loading) return
    if (!hasAuth('permission:position:delete')) {
      toast(tx('暂无删除岗位权限，请联系管理员'), 'destructive')
      return
    }
    setPendingDelete(position)
  }

  async function confirmRemovePosition() {
    const position = pendingDelete
    if (!position?.id) return
    busyRef.current = true
    setBusy(true)
    try {
      const response = await positionApi.deleteByIds([position.id])
      if (response.data.code !== 200) throw new Error(response.data.message || tx('岗位删除失败'))
      if (form?.id === position.id) setForm(null)
      toast(tx('岗位删除成功'), 'success')
      setPendingDelete(null)
      tableRef.current?.search()
      await onChanged()
    } catch (error) {
      toast(departmentErrorMessage(error, tx('岗位删除失败，请重试')), 'destructive')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return {
    tableRef,
    request,
    busy,
    form,
    setForm,
    savePosition,
    removePosition,
    pendingDelete,
    setPendingDelete,
    confirmRemovePosition,
    canCreate: canAccess('permission:position:save'),
    canEdit: canAccess('permission:position:update'),
    canDelete: canAccess('permission:position:delete'),
  }
}
