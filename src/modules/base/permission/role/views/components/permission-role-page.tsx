import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { create, deleteByIds, getRolePermission, setRolePermission, save, type RoleVo } from '@/modules/base/permission/role/api/role'
import { page as pageMenus, type MenuVo } from '@/modules/base/permission/menu/api/menu'
import { extractList } from '@/utils/api-data'
import { getMenuLabel } from '@/router/dynamic-menu'

import type { MaProTableExpose } from '@/components/ma-pro-table'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { useToast } from '@/components/common/use-toast'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import RoleProTable from './RoleProTable'

type RoleForm = RoleVo

const emptyForm: RoleForm = { name: '', code: '', status: 1, sort: 0, remark: '' }

function responseMessage(response: { data?: { message?: string } }) {
  return response.data?.message || '操作失败'
}

function normalizeMenuTree(menus: MenuVo[]): MenuVo[] {
  const allMenus: MenuVo[] = []
  const visit = (menu: MenuVo, inheritedParentId?: number) => {
    const normalized = {
      ...menu,
      parent_id: menu.parent_id ?? inheritedParentId,
      children: [] as MenuVo[],
    }
    allMenus.push(normalized)
    menu.children?.forEach(child => visit(child, menu.id))
  }
  menus.forEach(visit)

  const byId = new Map<number, MenuVo>()
  allMenus.forEach(menu => {
    if (menu.id !== undefined) byId.set(menu.id, menu)
  })

  const roots: MenuVo[] = []
  allMenus.forEach(menu => {
    const parent = menu.parent_id ? byId.get(menu.parent_id) : undefined
    if (parent) parent.children?.push(menu)
    else roots.push(menu)
  })
  return roots
}

function filterMenuTree(menus: MenuVo[], keyword: string): MenuVo[] {
  const query = keyword.trim().toLowerCase()
  if (!query) return menus

  return menus.flatMap(menu => {
    const children = filterMenuTree(menu.children ?? [], query)
    const searchableText = [getMenuLabel(menu), menu.name, menu.path, menu.route].filter(Boolean).join(' ').toLowerCase()
    if (searchableText.includes(query)) return [{ ...menu, children: menu.children ?? [] }]
    return children.length ? [{ ...menu, children }] : []
  })
}

function PermissionMenuTree({ menus, permissionNames, onToggle }: {
  menus: MenuVo[]
  permissionNames: string[]
  onToggle: (name: string) => void
}) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() => new Set())

  const renderMenus = (items: MenuVo[], level: number): ReactNode => (
    <div className={level > 0 ? 'ml-4 border-l pl-2' : undefined}>
      {items.map((menu, index) => {
        const children = menu.children ?? []
        const key = String(menu.id ?? `${menu.parent_id ?? 'root'}-${menu.name ?? menu.path ?? index}`)
        const collapsed = collapsedKeys.has(key)
        return (
          <div key={key}>
            <div className="flex min-w-0 items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              {children.length > 0
                ? <button type="button" className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-background" aria-label={collapsed ? `展开${getMenuLabel(menu)}` : `收起${getMenuLabel(menu)}`} aria-expanded={!collapsed} onClick={() => setCollapsedKeys(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next })}>{collapsed ? <ChevronRight className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}</button>
                : <span className="size-5 shrink-0" aria-hidden="true" />}
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <Checkbox checked={Boolean(menu.name && permissionNames.includes(menu.name))} onCheckedChange={() => menu.name && onToggle(menu.name)} />
                <span className={`min-w-0 flex-1 truncate ${children.length ? 'font-medium' : ''}`}>{getMenuLabel(menu)}</span>
                <code className="max-w-48 truncate text-xs text-muted-foreground">{menu.name || menu.path}</code>
              </label>
            </div>
            {children.length > 0 && !collapsed && renderMenus(children, level + 1)}
          </div>
        )
      })}
    </div>
  )

  return <>{renderMenus(menus, 0)}</>
}

export default function PermissionRolePageView() {
  const tableRef = useRef<MaProTableExpose<RoleVo>>(null)
  const { toast } = useToast()
  const [menus, setMenus] = useState<MenuVo[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [permissionOpen, setPermissionOpen] = useState(false)
  const [form, setForm] = useState<RoleForm>(emptyForm)
  const [permissionRole, setPermissionRole] = useState<RoleVo | null>(null)
  const [permissionNames, setPermissionNames] = useState<string[]>([])
  const [permissionLoading, setPermissionLoading] = useState(false)
  const [permissionReady, setPermissionReady] = useState(false)
  const [permissionSaving, setPermissionSaving] = useState(false)
  const [permissionSearch, setPermissionSearch] = useState('')
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<number[]>([])
  const permissionRequestRef = useRef(0)
  const permissionSavingRef = useRef(false)
  useEffect(() => () => { permissionRequestRef.current += 1 }, [])

  const refreshRoles = useCallback(async () => {
    tableRef.current?.getTableRef()?.clearSelection()
    await tableRef.current?.refresh()
  }, [])
  const handleSelectionChange = useCallback((rows: RoleVo[]) => {
    setSelectedIds(rows.flatMap(row => row.id ? [row.id] : []))
  }, [])

  const openCreate = () => { setForm({ ...emptyForm }); setFormOpen(true) }

  useHeaderActions(<Button onClick={openCreate}><Plus aria-hidden="true" />新增角色</Button>)

  async function submitForm() {
    if (!form.name || !form.code) { toast('角色名称和编码不能为空', 'warning'); return }
    try {
      const response = form.id ? await save(form.id, form) : await create(form)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setFormOpen(false)
      toast(form.id ? '角色更新成功' : '角色创建成功', 'success')
      await refreshRoles()
    }
    catch (error) { toast(error instanceof Error ? error.message : '角色保存失败', 'destructive') }
  }

  async function removeRoles(ids: number[]) {
    if (!ids.length) return
    setConfirmDeleteIds(ids)
  }

  async function confirmRemoveRoles() {
    const ids = confirmDeleteIds
    if (!ids.length) return
    try {
      const response = await deleteByIds(ids)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      toast('角色删除成功', 'success')
      setConfirmDeleteIds([])
      await refreshRoles()
    }
    catch (error) { toast(error instanceof Error ? error.message : '角色删除失败', 'destructive') }
  }

  const closePermissions = useCallback(() => {
    permissionRequestRef.current += 1
    permissionSavingRef.current = false
    setPermissionOpen(false)
    setPermissionRole(null)
    setMenus([])
    setPermissionNames([])
    setPermissionSearch('')
    setPermissionLoading(false)
    setPermissionReady(false)
    setPermissionSaving(false)
  }, [])

  async function openPermissions(role: RoleVo) {
    if (!role.id) return
    if (permissionSavingRef.current) return
    const requestId = ++permissionRequestRef.current
    setPermissionRole(role)
    setPermissionOpen(true)
    setMenus([])
    setPermissionNames([])
    setPermissionSearch('')
    setPermissionLoading(true)
    setPermissionReady(false)
    try {
      const [menuResponse, permissionResponse] = await Promise.all([pageMenus(), getRolePermission(role.id)])
      if (requestId !== permissionRequestRef.current) return
      setMenus(normalizeMenuTree(extractList<MenuVo>(menuResponse.data.data)))
      setPermissionNames(extractList<{ name?: string }>(permissionResponse.data.data).map(item => item.name).filter((name): name is string => Boolean(name)))
      setPermissionReady(true)
    }
    catch (error) {
      if (requestId === permissionRequestRef.current) toast(error instanceof Error ? error.message : '权限数据加载失败', 'destructive')
    }
    finally {
      if (requestId === permissionRequestRef.current) setPermissionLoading(false)
    }
  }

  async function savePermissions() {
    if (!permissionRole?.id || permissionLoading || permissionSavingRef.current || !permissionReady) return
    const requestId = permissionRequestRef.current
    permissionSavingRef.current = true
    setPermissionSaving(true)
    try {
      const response = await setRolePermission(permissionRole.id, permissionNames)
      if (requestId !== permissionRequestRef.current) return
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      closePermissions()
      toast('角色权限更新成功', 'success')
    }
    catch (error) {
      if (requestId !== permissionRequestRef.current) return
      toast(error instanceof Error ? error.message : '角色权限更新失败', 'destructive') }
    finally { if (requestId === permissionRequestRef.current) { permissionSavingRef.current = false; setPermissionSaving(false) } }
  }

  function togglePermission(name: string) {
    if (permissionSavingRef.current) return
    setPermissionNames(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name])
  }

  const filteredPermissionMenus = filterMenuTree(menus, permissionSearch)

  return (
    <>
      <RoleProTable
        tableRef={tableRef}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onCreate={openCreate}
        onEdit={role => { setForm({ ...role }); setFormOpen(true) }}
        onPermissions={openPermissions}
        onDelete={removeRoles}
      />
      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{form.id ? '编辑角色' : '新增角色'}</DialogTitle><DialogDescription>角色编码用于权限识别，保存后可继续配置菜单权限。</DialogDescription></DialogHeader><FieldGroup className="grid gap-4 md:grid-cols-2"><Field><FieldLabel>角色名称</FieldLabel><Input value={form.name || ''} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></Field><Field><FieldLabel>角色编码</FieldLabel><Input value={form.code || ''} disabled={Boolean(form.id)} onChange={event => setForm(current => ({ ...current, code: event.target.value }))} /></Field><Field><FieldLabel>排序</FieldLabel><Input type="number" value={String(form.sort ?? 0)} onChange={event => setForm(current => ({ ...current, sort: Number(event.target.value) }))} /></Field><Field><FieldLabel>状态</FieldLabel><Select value={String(form.status || 1)} onValueChange={value => setForm(current => ({ ...current, status: Number(value) as 1 | 2 }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">启用</SelectItem><SelectItem value="2">禁用</SelectItem></SelectContent></Select></Field><Field className="md:col-span-2"><FieldLabel>备注</FieldLabel><Input value={form.remark || ''} onChange={event => setForm(current => ({ ...current, remark: event.target.value }))} /></Field></FieldGroup><DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button><Button onClick={() => void submitForm()}>保存</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={permissionOpen} onOpenChange={open => { if (!permissionSavingRef.current) { if (open) setPermissionOpen(true); else closePermissions() } }}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>配置菜单权限</DialogTitle><DialogDescription>{permissionRole?.name || '当前角色'} 可以访问的菜单。</DialogDescription></DialogHeader>{permissionLoading && <p className="text-sm text-muted-foreground">正在加载权限数据…</p>}{!permissionLoading && !permissionReady && <p className="text-sm text-destructive">权限数据加载失败，请关闭后重试。</p>}{permissionReady && <><div className="relative"><Input className="pr-9" value={permissionSearch} onChange={event => setPermissionSearch(event.target.value)} placeholder="搜索菜单名称、路径或权限编码" aria-label="搜索菜单权限" />{permissionSearch && <button type="button" className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setPermissionSearch('')} aria-label="清除菜单搜索"><X className="size-3.5" aria-hidden="true" /></button>}</div><div className="max-h-[55vh] overflow-y-auto rounded-md border p-3">{filteredPermissionMenus.length ? <PermissionMenuTree key={permissionSearch || 'all'} menus={filteredPermissionMenus} permissionNames={permissionNames} onToggle={togglePermission} /> : <p className="py-8 text-center text-sm text-muted-foreground">{menus.length ? '没有匹配的菜单权限。' : '暂无可配置菜单。'}</p>}</div></>}<DialogFooter><Button variant="outline" onClick={closePermissions} disabled={permissionSaving}>取消</Button><Button disabled={permissionLoading || permissionSaving || !permissionReady || !permissionRole?.id} onClick={() => void savePermissions()}>{permissionSaving ? '保存中…' : '保存权限'}</Button></DialogFooter></DialogContent></Dialog>
      <ConfirmDialog open={confirmDeleteIds.length > 0} title="删除角色" description={`确认删除 ${confirmDeleteIds.length} 个角色吗？`} onClose={() => setConfirmDeleteIds([])} onConfirm={confirmRemoveRoles} />
    </>
  )
}
