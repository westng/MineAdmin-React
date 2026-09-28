import { useQuery } from '@tanstack/react-query'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import { useSession } from '@/hooks/auth/use-session'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createDepartmentApi } from '@/modules/base/department/api/department'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { PermissionGate } from '@/provider/access/permission-gate'
import { usePermission } from '@/hooks/auth/use-permission'
import { useCallback, useMemo, useState } from 'react'
import { Plus, UsersRound } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { MaDialog, useMaFormDialog, useMaConfirm } from '@/components/ma-dialog'
import { MaForm } from '@/components/ma-form'

import type { DepartmentUserVo, DepartmentVo } from '@/modules/base/department/api/department'
import { extractList } from '@/utils/api-data'

import DepartmentProTable from './components/DepartmentProTable'
import { flattenDepartments, paginateDepartments } from './data/department-tree'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { useToast } from '@/components/reui/use-toast'
import { DepartmentLeadersDialog } from './components/DepartmentLeadersDialog'
import { DepartmentPositionsDialog } from './components/DepartmentPositionsDialog'

import { getFormItems, toDepartmentForm, type DepartmentForm } from './data/getFormItems'

function relationCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

function departmentUsers(value: unknown): DepartmentUserVo[] {
  return Array.isArray(value) ? (value as DepartmentUserVo[]) : []
}

export default function PermissionDepartmentPageView() {
  const tx = useTextTranslator('base.permission.department.ui')
  function responseMessage(response: { data?: { message?: string } }) {
    return response.data?.message || tx('操作失败')
  }

  const departmentApi = useRuntimeFactory(createDepartmentApi)

  const localeRevision = useLocaleRevision()
  void localeRevision

  const runtime = useRuntime()
  useSession(state => state.sessionVersion)
  const [queryName, setQueryName] = useState('')
  const listQuery = useQuery(departmentApi.page.queryOptions(queryName ? { name: queryName } : {}), runtime.query)
  const departments = useMemo(() => extractList<DepartmentVo>(listQuery.data?.data.data), [listQuery.data])
  const [searchName, setSearchName] = useState('')
  const loading = listQuery.isFetching
  const { toast } = useToast()
  const { hasAuth } = usePermission()
  const error = listQuery.error?.message ?? ''
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [details, setDetails] = useState<DepartmentVo | null>(null)
  const [leaderDepartment, setLeaderDepartment] = useState<DepartmentVo | null>(null)
  const [positionDepartment, setPositionDepartment] = useState<DepartmentVo | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [collapsedIds, setCollapsedIds] = useState<number[]>([])
  const [pagination, setPagination] = useState({ currentPage: 1, pageSize: 10 })

  const loadDepartments = useCallback(
    async (name = '') => {
      setQueryName(name)
      setSelectedIds([])
      setPagination(current => ({ ...current, currentPage: 1 }))
      await runtime.query.fetchQuery({ ...departmentApi.page.queryOptions(name ? { name } : {}), staleTime: 0 })
    },
    [departmentApi, runtime],
  )

  const allRows = useMemo(() => flattenDepartments(departments), [departments])
  const departmentPage = useMemo(
    () => paginateDepartments(departments, pagination.currentPage, pagination.pageSize, collapsedIds),
    [collapsedIds, departments, pagination],
  )
  const editor = useMaFormDialog<DepartmentForm, DepartmentVo | null>({
    defaultValues: () => toDepartmentForm(null),
    toValues: toDepartmentForm,
    canSubmit: department => hasAuth(department?.id ? 'permission:department:update' : 'permission:department:save'),
    onSubmit: async (values, department) => {
      const payload: DepartmentVo = { name: values.name.trim(), parent_id: values.parent_id }
      const response = department?.id
        ? await departmentApi.save(department.id, payload)
        : await departmentApi.create(payload)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
    },
    onSuccess: async (_values, department) => {
      toast.success(department?.id ? tx('部门更新成功') : tx('部门创建成功'))
      await loadDepartments(searchName)
    },
    onError: error => toast.error(error instanceof Error ? error.message : tx('部门保存失败')),
  })
  const confirm = useMaConfirm({
    onError: error => toast.error(error instanceof Error ? error.message : tx('部门删除失败')),
  })
  const parentOptions = allRows.filter(row => row.department.id !== editor.data?.id)
  const openCreate = (parent?: DepartmentVo) => editor.open({ parent_id: parent?.id ?? 0 })
  const openEdit = (department: DepartmentVo) => editor.open(department)

  function toggleCollapsed(id: number) {
    setCollapsedIds(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]))
  }

  async function removeDepartments(ids: number[]) {
    if (!ids.length || !hasAuth('permission:department:delete')) return
    confirm.open({
      title: tx('删除部门'),
      description: tx('确认删除 {0} 个部门吗？', { '0': ids.length }),
      onConfirm: async () => {
        if (!hasAuth('permission:department:delete')) return false
        const response = await departmentApi.deleteByIds(ids)
        if (response.data.code !== 200) throw new Error(responseMessage(response))
        toast.success(tx('部门删除成功'))
        await loadDepartments(searchName)
      },
    })
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

      <MaDialog
        {...editor.dialogProps}
        title={editor.data?.id ? tx('编辑部门') : tx('新增部门')}
        description={tx('部门保存后会立即影响数据权限和组织树。')}
        okText={tx('保存')}
        cancelText={tx('取消')}
        showFullscreenButton={false}
        contentClassName="sm:max-w-lg"
      >
        <MaForm key={editor.formKey} {...editor.formProps} items={getFormItems(tx, parentOptions)} />
      </MaDialog>

      <MaDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title={
          <span className="flex items-center gap-2">
            <UsersRound className="size-5" aria-hidden="true" />
            {details?.name || tx('部门')}
            {tx('详情')}
          </span>
        }
        description={tx('查看部门负责人、岗位和当前关联用户。')}
        showFullscreenButton={false}
        contentClassName="sm:max-w-2xl"
        footer={false}
      >
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
        <div className="flex justify-end gap-2">
          <Button onClick={() => setDetailsOpen(false)}>{tx('关闭')}</Button>
        </div>
      </MaDialog>
      <MaDialog {...confirm.dialogProps} cancelText={tx('取消')} />
    </>
  )
}
