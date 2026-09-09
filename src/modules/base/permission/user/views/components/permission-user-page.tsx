import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MaForm } from '@/components/ma-form'
import type { MaProTableExpose } from '@/components/ma-pro-table'
import { createUser, deleteUsers, getUserRole, resetPassword, saveUser, setUserRole, type UserVo } from '@/modules/base/permission/user/api/user'
import { page as pageRoles, type RoleVo } from '@/modules/base/permission/role/api/role'
import { page as pageDepartments, type DepartmentVo } from '@/modules/base/permission/department/api/department'
import { page as pagePositions, type PositionVo } from '@/modules/base/permission/department/api/position'
import { extractList } from '@/utils/api-data'
import { useDictStore } from '@/provider/dictionary'
import { emptyForm, getFormItems, type UserForm } from '../data'
import UserProTable from './UserProTable'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'

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
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const [positions, setPositions] = useState<Array<{ id: number; dept_id?: number; name: string }>>([])

  const proTableRef = useRef<MaProTableExpose<UserVo>>(null)
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
    const flattenDepartments = (items: DepartmentVo[]): Array<{ id: number; name: string }> => items.flatMap(item => [
      ...(item.id && item.name ? [{ id: item.id, name: item.name }] : []),
      ...flattenDepartments(item.children ?? []),
    ])
    void Promise.all([pageDepartments({}), pagePositions({ page: 1, page_size: 500 })]).then(([departmentResponse, positionResponse]) => {
      if (!active) return
      const departmentList = extractList<DepartmentVo>(departmentResponse.data.data)
      const positionList = extractList<PositionVo>(positionResponse.data.data)
      setDepartments(flattenDepartments(departmentList))
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
    if (!ids.length || !window.confirm(`确认删除 ${ids.length} 个用户吗？`)) return
    try {
      const response = await deleteUsers(ids)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setNotice('用户删除成功')
      await refreshUsers()
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '用户删除失败')
    }
  }, [refreshUsers])

  const openRoles = useCallback(async (user: UserVo) => {
    setRoleUser(user)
    setRoleOpen(true)
    try {
      const [roleResponse, userRoleResponse] = await Promise.all([pageRoles({}), getUserRole(user.id as number)])
      setRoles(extractList<RoleVo>(roleResponse.data.data))
      setRoleCodes(extractList<{ code: string }>(userRoleResponse.data.data).map(role => role.code))
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '角色信息加载失败')
    }
  }, [])

  async function saveRoles() {
    if (!roleUser?.id) return
    try {
      const response = await setUserRole(roleUser.id, roleCodes)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setRoleOpen(false)
      setNotice('用户角色更新成功')
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '用户角色更新失败')
    }
  }

  const initializePassword = useCallback(async (user: UserVo) => {
    if (!user.id || !window.confirm(`确认将 ${user.username || '该用户'} 密码重置为初始密码吗？`)) return
    try {
      const response = await resetPassword(user.id)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setNotice('初始密码设置成功')
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '密码重置失败')
    }
  }, [])

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

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{form.id ? '编辑用户' : '新增用户'}</DialogTitle><DialogDescription>填写用户基本信息，保存后立即生效。</DialogDescription></DialogHeader><MaForm<UserForm> key={`${formOpen ? 'open' : 'closed'}-${form.id ?? 'new'}`} modelValue={form} items={formItems} options={{ layout: 'grid', grid: { columns: 2, gap: '1rem' } }} onModelValueChange={setForm} onSubmit={submitForm}><DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>取消</Button><Button type="submit">保存</Button></DialogFooter></MaForm></DialogContent></Dialog>
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}><DialogContent><DialogHeader><DialogTitle>设置用户角色</DialogTitle><DialogDescription>{roleUser?.username || '当前用户'} 可分配的角色。</DialogDescription></DialogHeader><div className="grid gap-2">{roles.map(role => <label key={role.code} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><Checkbox checked={Boolean(role.code && roleCodes.includes(role.code))} onCheckedChange={checked => setRoleCodes(current => checked ? [...current, role.code as string] : current.filter(code => code !== role.code))} /><span>{role.name}（{role.code}）</span></label>)}{!roles.length && <p className="text-sm text-muted-foreground">暂无可分配角色。</p>}</div><DialogFooter><Button variant="outline" onClick={() => setRoleOpen(false)}>取消</Button><Button onClick={() => void saveRoles()}>保存角色</Button></DialogFooter></DialogContent></Dialog>
    </>
  )
}
