import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { create, deleteByIds, getRolePermission, page, setRolePermission, save, type RoleVo } from '@/modules/base/permission/role/api/role'
import { page as pageMenus, type MenuVo } from '@/modules/base/permission/menu/api/menu'
import { extractList, extractTotal } from '@/utils/api-data'
import { flattenVisibleMenus, getMenuLabel } from '@/router/dynamic-menu'

type RoleForm = RoleVo
type RoleSearch = { name: string; code: string; status: string }

const emptySearch: RoleSearch = { name: '', code: '', status: '' }
const emptyForm: RoleForm = { name: '', code: '', status: 1, sort: 0, remark: '' }

function responseMessage(response: { data?: { message?: string } }) {
  return response.data?.message || '操作失败'
}

export default function PermissionRolePageView() {
  const [roles, setRoles] = useState<RoleVo[]>([])
  const [menus, setMenus] = useState<MenuVo[]>([])
  const [search, setSearch] = useState<RoleSearch>(emptySearch)
  const [pageIndex, setPageIndex] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [permissionOpen, setPermissionOpen] = useState(false)
  const [form, setForm] = useState<RoleForm>(emptyForm)
  const [permissionRole, setPermissionRole] = useState<RoleVo | null>(null)
  const [permissionNames, setPermissionNames] = useState<string[]>([])

  const loadRoles = useCallback(async (nextPage = 1, nextSearch = emptySearch) => {
    setLoading(true)
    try {
      const response = await page({ ...nextSearch, page: nextPage, page_size: 20, status: nextSearch.status ? Number(nextSearch.status) : undefined })
      const payload = response.data.data
      const list = extractList<RoleVo>(payload)
      setRoles(list)
      setTotal(extractTotal(payload, list.length))
      setPageIndex(nextPage)
      setSelectedIds([])
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '角色列表加载失败')
    }
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRoles() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadRoles])

  async function submitForm() {
    if (!form.name || !form.code) { setNotice('角色名称和编码不能为空'); return }
    try {
      const response = form.id ? await save(form.id, form) : await create(form)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setFormOpen(false)
      setNotice(form.id ? '角色更新成功' : '角色创建成功')
      await loadRoles(pageIndex, search)
    }
    catch (error) { setNotice(error instanceof Error ? error.message : '角色保存失败') }
  }

  async function removeRoles(ids: number[]) {
    if (!ids.length || !window.confirm(`确认删除 ${ids.length} 个角色吗？`)) return
    try {
      const response = await deleteByIds(ids)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setNotice('角色删除成功')
      await loadRoles(pageIndex, search)
    }
    catch (error) { setNotice(error instanceof Error ? error.message : '角色删除失败') }
  }

  async function openPermissions(role: RoleVo) {
    setPermissionRole(role)
    setPermissionOpen(true)
    try {
      const [menuResponse, permissionResponse] = await Promise.all([pageMenus(), getRolePermission(role.id as number)])
      setMenus(extractList<MenuVo>(menuResponse.data.data))
      setPermissionNames(extractList<{ name?: string }>(permissionResponse.data.data).map(item => item.name).filter((name): name is string => Boolean(name)))
    }
    catch (error) { setNotice(error instanceof Error ? error.message : '权限数据加载失败') }
  }

  async function savePermissions() {
    if (!permissionRole?.id) return
    try {
      const response = await setRolePermission(permissionRole.id, permissionNames)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setPermissionOpen(false)
      setNotice('角色权限更新成功')
    }
    catch (error) { setNotice(error instanceof Error ? error.message : '角色权限更新失败') }
  }

  function togglePermission(name: string) {
    setPermissionNames(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name])
  }

  const permissionTree = flattenVisibleMenus(menus)

  return (
    <>
      <Card className="shadow-none"><CardHeader className="gap-1 border-b"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" aria-hidden="true" />角色管理</CardTitle><CardDescription>维护角色编码并配置菜单权限。</CardDescription></div><div className="flex gap-2"><Button variant="outline" onClick={() => void loadRoles(pageIndex, search)}><RefreshCw className="size-4" aria-hidden="true" />刷新</Button><Button onClick={() => { setForm({ ...emptyForm }); setFormOpen(true) }}><Plus className="size-4" aria-hidden="true" />新增角色</Button></div></div><div className="grid gap-3 pt-3 md:grid-cols-3"><Field><FieldLabel>角色名称</FieldLabel><Input value={search.name} onChange={event => setSearch(current => ({ ...current, name: event.target.value }))} /></Field><Field><FieldLabel>角色编码</FieldLabel><Input value={search.code} onChange={event => setSearch(current => ({ ...current, code: event.target.value }))} /></Field><Field><FieldLabel>状态</FieldLabel><Select value={search.status} onValueChange={value => setSearch(current => ({ ...current, status: value || '' }))}><SelectTrigger><SelectValue placeholder="全部状态" /></SelectTrigger><SelectContent><SelectItem value="1">启用</SelectItem><SelectItem value="2">禁用</SelectItem></SelectContent></Select></Field></div><div className="flex flex-wrap gap-2 pt-3"><Button onClick={() => void loadRoles(1, search)}><Search className="size-4" aria-hidden="true" />查询</Button><Button variant="outline" onClick={() => { setSearch(emptySearch); void loadRoles(1, emptySearch) }}>重置</Button><Button variant="destructive" disabled={!selectedIds.length} onClick={() => void removeRoles(selectedIds)}><Trash2 className="size-4" aria-hidden="true" />批量删除</Button></div></CardHeader><CardContent className="p-0">{notice && <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground"><span>{notice}</span><Button variant="ghost" size="icon-xs" aria-label="关闭提示" onClick={() => setNotice('')}><X className="size-3" /></Button></div>}<Table><TableHeader><TableRow><TableHead className="w-10"><Checkbox checked={roles.length > 0 && roles.every(role => role.id && selectedIds.includes(role.id))} onCheckedChange={checked => setSelectedIds(checked ? roles.flatMap(role => role.id ? [role.id] : []) : [])} aria-label="选择全部" /></TableHead><TableHead>角色名称</TableHead><TableHead>角色编码</TableHead><TableHead>排序</TableHead><TableHead>状态</TableHead><TableHead>备注</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{roles.map(role => <TableRow key={role.id || role.code}><TableCell><Checkbox checked={Boolean(role.id && selectedIds.includes(role.id))} onCheckedChange={checked => setSelectedIds(current => checked ? [...current, role.id as number] : current.filter(id => id !== role.id))} aria-label={`选择 ${role.name || '角色'}`} /></TableCell><TableCell className="font-medium">{role.name || '-'}</TableCell><TableCell><code className="text-xs">{role.code || '-'}</code></TableCell><TableCell>{role.sort ?? 0}</TableCell><TableCell><Badge variant={role.status === 1 ? 'default' : 'secondary'}>{role.status === 1 ? '启用' : '禁用'}</Badge></TableCell><TableCell className="max-w-56 truncate">{role.remark || '-'}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => void openPermissions(role)}><KeyRound className="size-3.5" aria-hidden="true" />权限</Button><Button variant="ghost" size="sm" onClick={() => { setForm({ ...role }); setFormOpen(true) }}><Pencil className="size-3.5" aria-hidden="true" />编辑</Button><Button variant="ghost" size="sm" className="text-destructive" disabled={role.code === 'SuperAdmin'} onClick={() => void removeRoles(role.id ? [role.id] : [])}>删除</Button></div></TableCell></TableRow>)}{!roles.length && <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{loading ? '加载中…' : '暂无角色数据'}</TableCell></TableRow>}</TableBody></Table><div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground"><span>共 {total} 条</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={pageIndex <= 1 || loading} onClick={() => void loadRoles(pageIndex - 1, search)}>上一页</Button><span className="px-2 py-1">第 {pageIndex} 页</span><Button variant="outline" size="sm" disabled={pageIndex * 20 >= total || loading} onClick={() => void loadRoles(pageIndex + 1, search)}>下一页</Button></div></div></CardContent></Card>
      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{form.id ? '编辑角色' : '新增角色'}</DialogTitle><DialogDescription>角色编码用于权限识别，保存后可继续配置菜单权限。</DialogDescription></DialogHeader><FieldGroup className="grid gap-4 md:grid-cols-2"><Field><FieldLabel>角色名称</FieldLabel><Input value={form.name || ''} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></Field><Field><FieldLabel>角色编码</FieldLabel><Input value={form.code || ''} disabled={Boolean(form.id)} onChange={event => setForm(current => ({ ...current, code: event.target.value }))} /></Field><Field><FieldLabel>排序</FieldLabel><Input type="number" value={String(form.sort ?? 0)} onChange={event => setForm(current => ({ ...current, sort: Number(event.target.value) }))} /></Field><Field><FieldLabel>状态</FieldLabel><Select value={String(form.status || 1)} onValueChange={value => setForm(current => ({ ...current, status: Number(value) as 1 | 2 }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">启用</SelectItem><SelectItem value="2">禁用</SelectItem></SelectContent></Select></Field><Field className="md:col-span-2"><FieldLabel>备注</FieldLabel><Input value={form.remark || ''} onChange={event => setForm(current => ({ ...current, remark: event.target.value }))} /></Field></FieldGroup><DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button><Button onClick={() => void submitForm()}>保存</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={permissionOpen} onOpenChange={setPermissionOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>配置菜单权限</DialogTitle><DialogDescription>{permissionRole?.name || '当前角色'} 可以访问的菜单。</DialogDescription></DialogHeader><div className="max-h-[55vh] space-y-1 overflow-y-auto rounded-md border p-3">{permissionTree.map(menu => <label key={menu.id || menu.name || menu.path} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"><Checkbox checked={Boolean(menu.name && permissionNames.includes(menu.name))} onCheckedChange={() => menu.name && togglePermission(menu.name)} /><span>{getMenuLabel(menu)}</span><code className="ml-auto text-xs text-muted-foreground">{menu.name || menu.path}</code></label>)}{!permissionTree.length && <p className="py-8 text-center text-sm text-muted-foreground">暂无可配置菜单。</p>}</div><DialogFooter><Button variant="outline" onClick={() => setPermissionOpen(false)}>取消</Button><Button onClick={() => void savePermissions()}>保存权限</Button></DialogFooter></DialogContent></Dialog>
    </>
  )
}
