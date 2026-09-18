import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { PermissionGate } from '@/hooks/framework/use-permission'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, UsersRound } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/reui/primitives/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/reui/primitives/field'
import { Input } from '@/components/reui/primitives/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/reui/primitives/select'
import * as departmentApi from '@/modules/base/permission/department/api/department'
import type { DepartmentUserVo, DepartmentVo } from '@/modules/base/permission/department/api/department'
import { extractList } from '@/utils/api-data'

import DepartmentProTable from './DepartmentProTable'
import { flattenDepartments, paginateDepartments } from '../data/department-tree'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { useToast } from '@/components/reui/use-toast'
import { ConfirmDialog } from '@/components/reui/confirm-dialog'
import { DepartmentLeadersDialog } from '../../components/DepartmentLeadersDialog'
import { DepartmentPositionsDialog } from '../../components/DepartmentPositionsDialog'

const tx = createTextTranslator('base.permission.department.ui')

type DepartmentForm = { id?: number; name: string; parent_id: number }

const emptyForm: DepartmentForm = { name: '', parent_id: 0 }

function responseMessage(response: { data?: { message?: string } }) {
  return response.data?.message || tx('操作失败')
}

function relationCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

function departmentUsers(value: unknown): DepartmentUserVo[] {
  return Array.isArray(value) ? (value as DepartmentUserVo[]) : []
}

export default function PermissionDepartmentPageView() {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const [departments, setDepartments] = useState<DepartmentVo[]>([])
  const [searchName, setSearchName] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [error, setError] = useState('')
  const requestSequence = useRef(0)
  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [form, setForm] = useState<DepartmentForm>(emptyForm)
  const [details, setDetails] = useState<DepartmentVo | null>(null)
  const [leaderDepartment, setLeaderDepartment] = useState<DepartmentVo | null>(null)
  const [positionDepartment, setPositionDepartment] = useState<DepartmentVo | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [collapsedIds, setCollapsedIds] = useState<number[]>([])
  const [pagination, setPagination] = useState({ currentPage: 1, pageSize: 10 })
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<number[]>([])

  const loadDepartments = useCallback(async (name = '') => {
    const sequence = ++requestSequence.current
    setLoading(true)
    setError('')
    try {
      const response = await departmentApi.page(name ? { name } : {})
      if (sequence !== requestSequence.current) return
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      const nextDepartments = extractList<DepartmentVo>(response.data.data)
      setDepartments(nextDepartments)
      setPagination(current => ({
        ...current,
        currentPage: Math.min(current.currentPage, Math.max(1, Math.ceil(nextDepartments.length / current.pageSize))),
      }))
      setSelectedIds([])
    } catch (error) {
      if (sequence !== requestSequence.current) return
      setDepartments([])
      setPagination(current => ({ ...current, currentPage: 1 }))
      setSelectedIds([])
      setError(error instanceof Error ? error.message : tx('部门列表加载失败'))
    } finally {
      if (sequence === requestSequence.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDepartments()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      requestSequence.current += 1
    }
  }, [loadDepartments])

  const allRows = useMemo(() => flattenDepartments(departments), [departments])
  const departmentPage = useMemo(
    () => paginateDepartments(departments, pagination.currentPage, pagination.pageSize, collapsedIds),
    [collapsedIds, departments, pagination],
  )
  const parentOptions = allRows.filter(row => row.department.id !== form.id)

  function openCreate(parent?: DepartmentVo) {
    setForm({ ...emptyForm, parent_id: parent?.id || 0 })
    setFormOpen(true)
  }

  function openEdit(department: DepartmentVo) {
    setForm({ id: department.id, name: department.name || '', parent_id: department.parent_id || 0 })
    setFormOpen(true)
  }

  function toggleCollapsed(id: number) {
    setCollapsedIds(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]))
  }

  async function submitForm() {
    if (!form.name.trim()) {
      toast(tx('部门名称不能为空'), 'warning')
      return
    }
    setLoading(true)
    try {
      const payload: DepartmentVo = { name: form.name.trim(), parent_id: form.parent_id }
      const response = form.id ? await departmentApi.save(form.id, payload) : await departmentApi.create(payload)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setFormOpen(false)
      toast(form.id ? tx('部门更新成功') : tx('部门创建成功'), 'success')
      await loadDepartments(searchName)
    } catch (error) {
      toast(error instanceof Error ? error.message : tx('部门保存失败'), 'destructive')
    } finally {
      setLoading(false)
    }
  }

  async function removeDepartments(ids: number[]) {
    if (!ids.length) return
    setConfirmDeleteIds(ids)
  }

  async function confirmRemoveDepartments() {
    const ids = confirmDeleteIds
    if (!ids.length) return
    setLoading(true)
    try {
      const response = await departmentApi.deleteByIds(ids)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      toast(tx('部门删除成功'), 'success')
      setConfirmDeleteIds([])
      await loadDepartments(searchName)
    } catch (error) {
      toast(error instanceof Error ? error.message : tx('部门删除失败'), 'destructive')
    } finally {
      setLoading(false)
    }
  }

  const searchDepartments = useCallback(
    (name: string) => {
      setSearchName(name)
      setPagination(current => ({ ...current, currentPage: 1 }))
      setSelectedIds([])
      void loadDepartments(name)
    },
    [loadDepartments],
  )

  const changePage = useCallback((currentPage: number, pageSize: number) => {
    setPagination(current => ({ currentPage: current.pageSize === pageSize ? currentPage : 1, pageSize }))
    setSelectedIds([])
  }, [])

  useHeaderActions(
    <PermissionGate permission="permission:department:save">
      <Button onClick={() => openCreate()}>
        <Plus aria-hidden="true" />
        {tx('新增部门')}
      </Button>
    </PermissionGate>,
  )

  return (
    <>
      <DepartmentProTable
        rows={departmentPage.rows}
        total={allRows.length}
        pagination={{
          currentPage: departmentPage.currentPage,
          pageSize: pagination.pageSize,
          total: departments.length,
          onChange: changePage,
        }}
        loading={loading}
        error={error}
        selectedIds={selectedIds}
        collapsedIds={collapsedIds}
        onSelectionChange={setSelectedIds}
        onToggle={toggleCollapsed}
        onToggleAll={() =>
          setCollapsedIds(
            collapsedIds.length
              ? []
              : allRows.flatMap(row =>
                  row.department.children?.length && row.department.id ? [row.department.id] : [],
                ),
          )
        }
        onCreate={openCreate}
        onEdit={openEdit}
        onDetails={department => {
          setDetails(department)
          setDetailsOpen(true)
        }}
        onLeaders={setLeaderDepartment}
        onPositions={setPositionDepartment}
        onDelete={removeDepartments}
        onSearch={searchDepartments}
        onRefresh={() => void loadDepartments(searchName)}
      />

      {leaderDepartment?.id && (
        <DepartmentLeadersDialog
          key={leaderDepartment.id}
          departmentId={leaderDepartment.id}
          departmentName={leaderDepartment.name || tx('当前部门')}
          onClose={() => setLeaderDepartment(null)}
          onChanged={() => loadDepartments(searchName)}
        />
      )}
      {positionDepartment?.id && (
        <DepartmentPositionsDialog
          key={positionDepartment.id}
          departmentId={positionDepartment.id}
          departmentName={positionDepartment.name || tx('当前部门')}
          onClose={() => setPositionDepartment(null)}
          onChanged={() => loadDepartments(searchName)}
        />
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? tx('编辑部门') : tx('新增部门')}</DialogTitle>
            <DialogDescription>{tx('部门保存后会立即影响数据权限和组织树。')}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="department-name">{tx('部门名称')}</FieldLabel>
              <Input
                id="department-name"
                value={form.name}
                onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                placeholder={tx('例如：研发中心')}
              />
            </Field>
            <Field>
              <FieldLabel>{tx('上级部门')}</FieldLabel>
              <Select
                value={String(form.parent_id)}
                onValueChange={value => setForm(current => ({ ...current, parent_id: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tx('顶级部门')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{tx('顶级部门')}</SelectItem>
                  {parentOptions.map(row => (
                    <SelectItem key={row.department.id} value={String(row.department.id)}>
                      {'　'.repeat(row.depth)}
                      {row.department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {tx('取消')}
            </Button>
            <PermissionGate permission={form.id ? 'permission:department:update' : 'permission:department:save'}>
              <Button onClick={() => void submitForm()} disabled={loading}>
                {tx('保存')}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="size-5" aria-hidden="true" />
              {details?.name || tx('部门')}
              {tx('详情')}
            </DialogTitle>
            <DialogDescription>{tx('查看部门负责人、岗位和当前关联用户。')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">{tx('负责人')}</p>
              <p className="mt-2 font-medium">
                {relationCount(details?.leader)} {tx('人')}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                {departmentUsers(details?.leader).map(user => (
                  <p key={user.id || user.username}>{user.nickname || user.username || '-'}</p>
                ))}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">{tx('岗位')}</p>
              <p className="mt-2 font-medium">
                {relationCount(details?.positions)} {tx('个')}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                {details?.positions?.map(position => (
                  <p key={position.id || position.name}>{position.name || '-'}</p>
                ))}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">{tx('部门用户')}</p>
              <p className="mt-2 font-medium">
                {relationCount(details?.department_users)} {tx('人')}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                {departmentUsers(details?.department_users).map(user => (
                  <p key={user.id || user.username}>{user.nickname || user.username || '-'}</p>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)}>{tx('关闭')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDeleteIds.length > 0}
        title={tx('删除部门')}
        description={tx('确认删除 {0} 个部门吗？删除部门会同步清理其岗位和关联关系。', {
          '0': confirmDeleteIds.length,
        })}
        onClose={() => setConfirmDeleteIds([])}
        onConfirm={confirmRemoveDepartments}
      />
    </>
  )
}
