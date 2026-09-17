import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MaDialog } from '@/components/ma-dialog'
import { MaForm } from '@/components/ma-form'
import type { MaProTableExpose } from '@/components/ma-pro-table'
import type { MaFormExpose } from '@/components/ma-form'
import { createUser, deleteUsers, getUserRole, resetPassword, saveUser, setUserRole, type UserVo } from '@/modules/base/permission/user/api/user'
import { page as pageRoles, type RoleVo } from '@/modules/base/permission/role/api/role'
import { page as pageDepartments, type DepartmentVo } from '@/modules/base/permission/department/api/department'
import { page as pagePositions, type PositionVo } from '@/modules/base/permission/department/api/position'
import { extractList } from '@/utils/api-data'
import { useDictStore } from '@/provider/dictionary'
import { emptyForm, getFormItems, type DepartmentOption, type UserForm } from '../data'
import UserProTable from './UserProTable'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

function responseMessage(response: { data?: { code?: number; message?: string } }) {
  return response.data?.message || '操作失败'
}

export default function PermissionUserPageView() {
  const dictionary = useDictStore(state => state.t)
  const [notice, setNotice] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [roleUser, setRoleUser] = useState<UserVo | null>(null)
  const [roles, setRoles] = useState<RoleVo[]>([])
  const [roleCodes, setRoleCodes] = useState<string[]>([])
  const [roleLoading, setRoleLoading] = useState(false)
  const [roleReady, setRoleReady] = useState(false)
  const [roleSaving, setRoleSaving] = useState(false)
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [positions, setPositions] = useState<Array<{ id: number; dept_id?: number; name: string }>>([])
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<number[]>([])
  const [resetUser, setResetUser] = useState<UserVo | null>(null)

  const proTableRef = useRef<MaProTableExpose<UserVo>>(null)
  const formRef = useRef<MaFormExpose<UserForm>>(null)
  const roleRequestRef = useRef(0)
  const roleSavingRef = useRef(false)
  useEffect(() => () => { roleRequestRef.current += 1 }, [])
  const refreshUsers = useCallback(async () => {
    setSelectedIds([])
    proTableRef.current?.getTableRef()?.clearSelection()
    await proTableRef.current?.refresh()
  }, [])

  const getStatusLabel = useCallback((value: unknown) => String(dictionary('system-status', String(value)) || '未知'), [dictionary])
  const getUserTypeLabel = useCallback((value: unknown) => String(dictionary('base-userType', String(value)) || '普通用户'), [dictionary])
  const handleSelectionChange = useCallback((rows: UserVo[]) => {
    setSelectedIds(rows.flatMap(row => row.id ? [row.id] : []))
  }, [])

  useEffect(() => {
    let active = true
    const normalizeDepartments = (items: DepartmentVo[]): DepartmentOption[] => items.flatMap(item => {
      if (!item.id || !item.name) return []
      return [{
        id: item.id,
        name: item.name,
        children: normalizeDepartments(item.children ?? []),
      }]
    })
    void Promise.all([pageDepartments({}), pagePositions({ page: 1, page_size: 500 })]).then(([departmentResponse, positionResponse]) => {
      if (!active) return
      const departmentList = extractList<DepartmentVo>(departmentResponse.data.data)
      const positionList = extractList<PositionVo>(positionResponse.data.data)
      setDepartments(normalizeDepartments(departmentList))
      setPositions(positionList.flatMap(position => position.id && position.name ? [{ id: position.id, dept_id: position.dept_id, name: position.name }] : []))
    }).catch(() => {
      // Permission errors should not prevent editing the other user fields.
    })
    return () => { active = false }
  }, [])

  const openCreate = useCallback(() => {
    setForm({ ...emptyForm })
    setFormOpen(true)
  }, [])

  useHeaderActions(<Button onClick={openCreate}><Plus aria-hidden="true" />新增用户</Button>)

  const openEdit = useCallback((user: UserVo) => {
    setForm({
      ...user,
      password: '',
      backend_setting: Array.isArray(user.backend_setting) ? user.backend_setting : [],
      department: user.departments?.flatMap(department => department.id ? [department.id] : []) ?? [],
      position: user.positions?.flatMap(position => position.id ? [position.id] : []) ?? [],
      policy: user.policy ? { ...user.policy, value: Array.isArray(user.policy.value) ? user.policy.value : [] } : { policy_type: 'SELF', is_default: true, value: [] },
      policy_func: user.policy?.policy_type === 'CUSTOM_FUNC' && user.policy.value?.[0] != null ? String(user.policy.value[0]) : '',
    })
    setFormOpen(true)
  }, [])

  const submitForm = useCallback(async (values: UserForm) => {
    if (!values.username || !values.nickname) {
      setNotice('用户名和昵称不能为空')
      return
    }
    try {
      const id = values.id
      const policy = values.policy?.policy_type
        ? {
            ...values.policy,
            value: values.policy.policy_type === 'CUSTOM_FUNC'
              ? (values.policy_func ? [values.policy_func] : [])
              : (Array.isArray(values.policy.value) ? values.policy.value : []),
          }
        : undefined
      const payload = {
        ...values,
        backend_setting: Array.isArray(values.backend_setting) ? values.backend_setting : [],
        department: Array.isArray(values.department) ? values.department : [],
        position: Array.isArray(values.position) ? values.position : [],
        policy,
      }
      delete payload.id
      delete payload.departments
      delete payload.positions
      delete payload.roles
      delete payload.policy_func
      const response = id ? await saveUser(id, payload) : await createUser(payload)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setFormOpen(false)
      setNotice(id ? '用户更新成功' : '用户创建成功')
      await refreshUsers()
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '用户保存失败')
    }
  }, [refreshUsers])

  const removeUsers = useCallback(async (ids: number[]) => {
    if (!ids.length) return
    setConfirmDeleteIds(ids)
  }, [])

  const confirmRemoveUsers = useCallback(async () => {
    const ids = confirmDeleteIds
    if (!ids.length) return
    try {
      const response = await deleteUsers(ids)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setNotice('用户删除成功')
      setConfirmDeleteIds([])
      await refreshUsers()
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '用户删除失败')
    }
  }, [confirmDeleteIds, refreshUsers])

  const closeRoles = useCallback(() => {
    roleRequestRef.current += 1
    roleSavingRef.current = false
    setRoleOpen(false)
    setRoleUser(null)
    setRoles([])
    setRoleCodes([])
    setRoleLoading(false)
    setRoleReady(false)
    setRoleSaving(false)
  }, [])

  const openRoles = useCallback(async (user: UserVo) => {
    if (!user.id) return
    if (roleSavingRef.current) return
    const requestId = ++roleRequestRef.current
    setRoleUser(user)
    setRoleOpen(true)
    setRoles([])
    setRoleCodes([])
    setRoleLoading(true)
    setRoleReady(false)
    try {
      const [roleResponse, userRoleResponse] = await Promise.all([pageRoles({}), getUserRole(user.id)])
      if (requestId !== roleRequestRef.current) return
      setRoles(extractList<RoleVo>(roleResponse.data.data))
      setRoleCodes(extractList<{ code: string }>(userRoleResponse.data.data).map(role => role.code))
      setRoleReady(true)
    }
    catch (error) {
      if (requestId === roleRequestRef.current) setNotice(error instanceof Error ? error.message : '角色信息加载失败')
    }
    finally {
      if (requestId === roleRequestRef.current) setRoleLoading(false)
    }
  }, [])

  async function saveRoles() {
    if (!roleUser?.id || roleLoading || roleSavingRef.current || !roleReady) return
    const requestId = roleRequestRef.current
    roleSavingRef.current = true
    setRoleSaving(true)
    try {
      const response = await setUserRole(roleUser.id, roleCodes)
      if (requestId !== roleRequestRef.current) return
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      closeRoles()
      setNotice('用户角色更新成功')
    }
    catch (error) {
      if (requestId !== roleRequestRef.current) return
      setNotice(error instanceof Error ? error.message : '用户角色更新失败')
    }
    finally {
      if (requestId === roleRequestRef.current) { roleSavingRef.current = false; setRoleSaving(false) }
    }
  }

  const initializePassword = useCallback(async (user: UserVo) => {
    if (!user.id) return
    setResetUser(user)
  }, [])

  const confirmInitializePassword = useCallback(async () => {
    if (!resetUser?.id) return
    try {
      const response = await resetPassword(resetUser.id)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setNotice('初始密码设置成功')
      setResetUser(null)
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '密码重置失败')
    }
  }, [resetUser])

  const formItems = useMemo(() => getFormItems(Boolean(form.id), { departments, positions }), [departments, form.id, positions])

  return (
    <>
      {notice && <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-2 text-sm text-muted-foreground"><span>{notice}</span><Button variant="ghost" size="icon-xs" aria-label="关闭提示" onClick={() => setNotice('')}><X className="size-3" /></Button></div>}
      <UserProTable
        proTableRef={proTableRef}
        selectedIds={selectedIds}
        getUserTypeLabel={getUserTypeLabel}
        getStatusLabel={getStatusLabel}
        onSelectionChange={handleSelectionChange}
        onRefresh={refreshUsers}
        onCreate={openCreate}
        onEdit={openEdit}
        onOpenRoles={openRoles}
        onInitializePassword={initializePassword}
        onDelete={removeUsers}
      />

      <MaDialog open={formOpen} onOpenChange={setFormOpen} title={form.id ? '编辑用户' : '新增用户'} description="填写用户基本信息、组织归属和数据权限，保存后立即生效。" okText="保存" cancelText="取消" onOk={() => { formRef.current?.getElFormRef()?.requestSubmit(); return false }} showFullscreenButton contentClassName="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-4xl" bodyClassName="min-h-0 overflow-y-auto"><MaForm<UserForm> ref={formRef} key={`${formOpen ? 'open' : 'closed'}-${form.id ?? 'new'}`} modelValue={form} items={formItems} options={{ layout: 'grid', grid: { columns: 2, gap: '1.25rem' }, containerClass: 'pb-1' }} onModelValueChange={setForm} onSubmit={submitForm} /></MaDialog>
      <Dialog open={roleOpen} onOpenChange={open => { if (!roleSavingRef.current) { if (open) setRoleOpen(true); else closeRoles() } }}><DialogContent><DialogHeader><DialogTitle>设置用户角色</DialogTitle><DialogDescription>{roleUser?.username || '当前用户'} 可分配的角色。</DialogDescription></DialogHeader><div className="grid gap-2">{roleLoading && <p className="text-sm text-muted-foreground">正在加载角色信息…</p>}{!roleLoading && roleReady && roles.map(role => <label key={role.code} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><Checkbox disabled={roleSaving} checked={Boolean(role.code && roleCodes.includes(role.code))} onCheckedChange={checked => setRoleCodes(current => checked ? [...current, role.code as string] : current.filter(code => code !== role.code))} /><span>{role.name}（{role.code}）</span></label>)}{!roleLoading && !roleReady && <p className="text-sm text-destructive">角色信息加载失败，请关闭后重试。</p>}{!roleLoading && roleReady && !roles.length && <p className="text-sm text-muted-foreground">暂无可分配角色。</p>}</div><DialogFooter><Button variant="outline" onClick={closeRoles} disabled={roleSaving}>取消</Button><Button disabled={roleLoading || roleSaving || !roleReady || !roleUser?.id} onClick={() => void saveRoles()}>{roleSaving ? '保存中…' : '保存角色'}</Button></DialogFooter></DialogContent></Dialog>
      <ConfirmDialog open={confirmDeleteIds.length > 0} title="删除用户" description={`确认删除 ${confirmDeleteIds.length} 个用户吗？`} onClose={() => setConfirmDeleteIds([])} onConfirm={confirmRemoveUsers} />
      <ConfirmDialog open={Boolean(resetUser)} title="重置用户密码" description={`确认将 ${resetUser?.username || '该用户'} 的密码重置为初始密码吗？`} onClose={() => setResetUser(null)} onConfirm={confirmInitializePassword} />
    </>
  )
}
