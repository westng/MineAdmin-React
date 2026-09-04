import { useCallback, useMemo, useRef, useState } from 'react'
import { Plus, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MaProTable, type MaProTableColumns, type MaProTableExpose } from '@/components/ma-pro-table'
import type { MaSearchItem } from '@/components/ma-search'
import { createUser, deleteUsers, getUserRole, pageUsers, resetPassword, saveUser, setUserRole, type UserVo } from '@/modules/base/permission/user/api/user'
import { page as pageRoles, type RoleVo } from '@/modules/base/permission/role/api/role'
import { extractList } from '@/utils/api-data'
import { useDictStore } from '@/provider/dictionary'

type UserForm = Partial<UserVo> & { password?: string }
type SearchState = { username: string; nickname: string; phone: string; email: string; status: string }

const emptySearch: SearchState = { username: '', nickname: '', phone: '', email: '', status: '' }
const emptyForm: UserForm = { username: '', nickname: '', password: '123456', phone: '', email: '', user_type: 100, status: 1, remark: '' }

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

  const proTableRef = useRef<MaProTableExpose<UserVo>>(null)
  const refreshUsers = useCallback(async () => {
    setSelectedIds([])
    proTableRef.current?.getTableRef()?.clearSelection()
    await proTableRef.current?.refresh()
  }, [])

  const statusLabel = useMemo(() => (value: unknown) => dictionary('system-status', String(value)) || '未知', [dictionary])
  const handleSelectionChange = useCallback((rows: UserVo[]) => {
    setSelectedIds(rows.flatMap(row => row.id ? [row.id] : []))
  }, [])

  function updateForm(field: keyof UserForm, value: string | number) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function submitForm() {
    if (!form.username || !form.nickname) {
      setNotice('用户名和昵称不能为空')
      return
    }
    try {
      const response = form.id ? await saveUser(form.id, form) : await createUser(form)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setFormOpen(false)
      setNotice(form.id ? '用户更新成功' : '用户创建成功')
      await refreshUsers()
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '用户保存失败')
    }
  }

  async function removeUsers(ids: number[]) {
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
  }

  async function openRoles(user: UserVo) {
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
  }

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

  async function initializePassword(user: UserVo) {
    if (!user.id || !window.confirm(`确认将 ${user.username || '该用户'} 密码重置为初始密码吗？`)) return
    try {
      const response = await resetPassword(user.id)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setNotice('初始密码设置成功')
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '密码重置失败')
    }
  }

  return (
    <>
      {notice && <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-2 text-sm text-muted-foreground"><span>{notice}</span><Button variant="ghost" size="icon-xs" aria-label="关闭提示" onClick={() => setNotice('')}><X className="size-3" /></Button></div>}
      <MaProTable<UserVo>
        ref={proTableRef}
        schema={{
          searchItems: [
            { label: '用户名', prop: 'username', render: 'Input', renderProps: { placeholder: '搜索用户名' } },
            { label: '昵称', prop: 'nickname', render: 'Input', renderProps: { placeholder: '搜索昵称' } },
            { label: '手机号', prop: 'phone', render: 'Input', renderProps: { placeholder: '搜索手机号' } },
            { label: '邮箱', prop: 'email', render: 'Input', renderProps: { placeholder: '搜索邮箱' } },
            { label: '状态', prop: 'status', render: 'Select', renderProps: { options: [{ label: '启用', value: '1' }, { label: '禁用', value: '2' }] } },
          ] as MaSearchItem<UserVo>[],
          tableColumns: [
            { type: 'selection', width: 44, label: '' },
            { prop: 'username', label: '用户名', cellRender: ({ row }) => <span className="font-medium">{row.username || '-'}</span> },
            { prop: 'nickname', label: '昵称', cellRender: ({ row }) => row.nickname || '-' },
            { prop: 'user_type', label: '用户类型', cellRender: ({ row }) => <Badge variant="outline">{dictionary('base-userType', String(row.user_type)) || '普通用户'}</Badge> },
            { prop: 'phone', label: '手机号', cellRender: ({ row }) => row.phone || '-' },
            { prop: 'email', label: '邮箱', cellRender: ({ row }) => row.email || '-' },
            { prop: 'status', label: '状态', cellRender: ({ row }) => <Badge variant={row.status === 1 ? 'default' : 'secondary'}>{statusLabel(row.status)}</Badge> },
            {
              label: '操作',
              align: 'right',
              cellRender: ({ row }) => <div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => { setForm({ ...row, password: '' }); setFormOpen(true) }}>编辑</Button><Button variant="ghost" size="sm" onClick={() => void openRoles(row)}><ShieldCheck className="size-3.5" aria-hidden="true" />角色</Button><Button variant="ghost" size="sm" onClick={() => void initializePassword(row)}>重置密码</Button><Button variant="ghost" size="sm" className="text-destructive" disabled={row.id === 1} onClick={() => void removeUsers(row.id ? [row.id] : [])}>删除</Button></div>,
            },
          ] as MaProTableColumns<UserVo>[],
        }}
        options={{
          header: { show: false },
          toolbar: true,
          searchOptions: { defaultValue: emptySearch, foldRows: 2 },
          searchFormOptions: { layout: 'grid', grid: { columns: 5, gap: '1rem' } },
          requestOptions: {
            api: params => pageUsers({ ...params, status: params.status ? Number(params.status) as 1 | 2 : undefined } as Partial<UserVo>),
            autoRequest: true,
            requestPage: { pageName: 'page', sizeName: 'page_size', size: 20 },
            response: { dataKey: 'list', totalKey: 'total' },
          },
        }}
        toolbar={<div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void refreshUsers()}><RefreshCw className="size-4" aria-hidden="true" />刷新</Button><Button size="sm" onClick={() => { setForm({ ...emptyForm }); setFormOpen(true) }}><Plus className="size-4" aria-hidden="true" />新增用户</Button><Button variant="destructive" size="sm" disabled={!selectedIds.length} onClick={() => void removeUsers(selectedIds)}><Trash2 className="size-4" aria-hidden="true" />批量删除</Button></div>}
        onSelectionChange={handleSelectionChange}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{form.id ? '编辑用户' : '新增用户'}</DialogTitle><DialogDescription>填写用户基本信息，保存后立即生效。</DialogDescription></DialogHeader><FieldGroup className="grid gap-4 md:grid-cols-2"><Field><FieldLabel htmlFor="user-username">用户名</FieldLabel><Input id="user-username" value={String(form.username || '')} disabled={Boolean(form.id)} onChange={event => updateForm('username', event.target.value)} /></Field><Field><FieldLabel htmlFor="user-nickname">昵称</FieldLabel><Input id="user-nickname" value={String(form.nickname || '')} onChange={event => updateForm('nickname', event.target.value)} /></Field><Field><FieldLabel htmlFor="user-password">密码</FieldLabel><Input id="user-password" type="password" value={String(form.password || '')} disabled={Boolean(form.id)} onChange={event => updateForm('password', event.target.value)} /></Field><Field><FieldLabel htmlFor="user-phone">手机号</FieldLabel><Input id="user-phone" value={String(form.phone || '')} onChange={event => updateForm('phone', event.target.value)} /></Field><Field><FieldLabel htmlFor="user-email">邮箱</FieldLabel><Input id="user-email" type="email" value={String(form.email || '')} onChange={event => updateForm('email', event.target.value)} /></Field><Field><FieldLabel>状态</FieldLabel><Select value={String(form.status || 1)} onValueChange={value => updateForm('status', Number(value))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">启用</SelectItem><SelectItem value="2">禁用</SelectItem></SelectContent></Select></Field></FieldGroup><DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button><Button onClick={() => void submitForm()}>保存</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}><DialogContent><DialogHeader><DialogTitle>设置用户角色</DialogTitle><DialogDescription>{roleUser?.username || '当前用户'} 可分配的角色。</DialogDescription></DialogHeader><div className="grid gap-2">{roles.map(role => <label key={role.code} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><Checkbox checked={Boolean(role.code && roleCodes.includes(role.code))} onCheckedChange={checked => setRoleCodes(current => checked ? [...current, role.code as string] : current.filter(code => code !== role.code))} /><span>{role.name}（{role.code}）</span></label>)}{!roles.length && <p className="text-sm text-muted-foreground">暂无可分配角色。</p>}</div><DialogFooter><Button variant="outline" onClick={() => setRoleOpen(false)}>取消</Button><Button onClick={() => void saveRoles()}>保存角色</Button></DialogFooter></DialogContent></Dialog>
    </>
  )
}
