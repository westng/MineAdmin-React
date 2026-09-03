import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, ChevronRight, Eye, Pencil, Plus, RefreshCw, Search, Trash2, UsersRound, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { departmentApi, type DepartmentUserVo, type DepartmentVo } from '@/modules/base/api'
import { extractList } from '@/modules/base/utils/api-data'

type DepartmentForm = { id?: number; name: string; parent_id: number }
type DepartmentRow = { department: DepartmentVo; depth: number }

const emptyForm: DepartmentForm = { name: '', parent_id: 0 }

function responseMessage(response: { data?: { message?: string } }) {
  return response.data?.message || '操作失败'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 19)
}

function relationCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

function flattenDepartments(departments: DepartmentVo[], collapsedIds: number[] = [], depth = 0, rows: DepartmentRow[] = []) {
  departments.forEach(department => {
    rows.push({ department, depth })
    if (department.id && collapsedIds.includes(department.id)) return
    if (department.children?.length) flattenDepartments(department.children, collapsedIds, depth + 1, rows)
  })
  return rows
}

function departmentUsers(value: unknown): DepartmentUserVo[] {
  return Array.isArray(value) ? value as DepartmentUserVo[] : []
}

export default function PermissionDepartmentPage() {
  const [departments, setDepartments] = useState<DepartmentVo[]>([])
  const [searchName, setSearchName] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [form, setForm] = useState<DepartmentForm>(emptyForm)
  const [details, setDetails] = useState<DepartmentVo | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [collapsedIds, setCollapsedIds] = useState<number[]>([])

  const loadDepartments = useCallback(async (name = '') => {
    setLoading(true)
    try {
      const response = await departmentApi.page(name ? { name } : {})
      setDepartments(extractList<DepartmentVo>(response.data.data))
      setSelectedIds([])
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '部门列表加载失败')
    }
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDepartments() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadDepartments])

  const allRows = useMemo(() => flattenDepartments(departments), [departments])
  const rows = useMemo(() => flattenDepartments(departments, collapsedIds), [collapsedIds, departments])
  const selectableIds = rows.flatMap(row => row.department.id ? [row.department.id] : [])
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.includes(id))
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
    setCollapsedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  async function submitForm() {
    if (!form.name.trim()) {
      setNotice('部门名称不能为空')
      return
    }
    setLoading(true)
    try {
      const payload: DepartmentVo = { name: form.name.trim(), parent_id: form.parent_id }
      const response = form.id ? await departmentApi.save(form.id, payload) : await departmentApi.create(payload)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setFormOpen(false)
      setNotice(form.id ? '部门更新成功' : '部门创建成功')
      await loadDepartments(searchName)
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '部门保存失败')
    }
    finally {
      setLoading(false)
    }
  }

  async function removeDepartments(ids: number[]) {
    if (!ids.length || !window.confirm(`确认删除 ${ids.length} 个部门吗？删除部门会同步清理其岗位和关联关系。`)) return
    setLoading(true)
    try {
      const response = await departmentApi.deleteByIds(ids)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setNotice('部门删除成功')
      await loadDepartments(searchName)
    }
    catch (error) {
      setNotice(error instanceof Error ? error.message : '部门删除失败')
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="shadow-none">
        <CardHeader className="gap-1 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><Building2 className="size-5" aria-hidden="true" />部门管理</CardTitle>
              <CardDescription>维护组织树、部门负责人、岗位和部门用户关系。</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadDepartments(searchName)}><RefreshCw className="size-4" aria-hidden="true" />刷新</Button>
              <Button onClick={() => openCreate()}><Plus className="size-4" aria-hidden="true" />新增部门</Button>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3 pt-3">
            <Field className="min-w-60 flex-1"><FieldLabel htmlFor="department-search-name">部门名称</FieldLabel><Input id="department-search-name" value={searchName} onChange={event => setSearchName(event.target.value)} placeholder="搜索部门名称" /></Field>
            <div className="flex gap-2"><Button onClick={() => void loadDepartments(searchName)}><Search className="size-4" aria-hidden="true" />查询</Button><Button variant="outline" onClick={() => { setSearchName(''); void loadDepartments() }}>重置</Button><Button variant="destructive" disabled={!selectedIds.length} onClick={() => void removeDepartments(selectedIds)}><Trash2 className="size-4" aria-hidden="true" />批量删除</Button></div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {notice && <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground"><span>{notice}</span><Button variant="ghost" size="icon-xs" aria-label="关闭提示" onClick={() => setNotice('')}><X className="size-3" /></Button></div>}
          <div className="flex items-center justify-between border-b px-4 py-2 text-sm text-muted-foreground"><span>共 {allRows.length} 个部门</span><Button variant="ghost" size="sm" onClick={() => setCollapsedIds(collapsedIds.length ? [] : allRows.flatMap(row => row.department.children?.length && row.department.id ? [row.department.id] : []))}>{collapsedIds.length ? '展开全部' : '折叠全部'}</Button></div>
          <Table>
            <TableHeader><TableRow><TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={checked => setSelectedIds(checked ? selectableIds : [])} aria-label="选择全部部门" /></TableHead><TableHead>部门名称</TableHead><TableHead>负责人</TableHead><TableHead>岗位</TableHead><TableHead>用户</TableHead><TableHead>创建时间</TableHead><TableHead>更新时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(({ department, depth }) => {
                const id = department.id as number | undefined
                const hasChildren = Boolean(department.children?.length)
                const isCollapsed = Boolean(id && collapsedIds.includes(id))
                return <TableRow key={id || department.name}>
                  <TableCell><Checkbox checked={Boolean(id && selectedIds.includes(id))} onCheckedChange={checked => id && setSelectedIds(current => checked ? [...current, id] : current.filter(item => item !== id))} aria-label={`选择 ${department.name || '部门'}`} /></TableCell>
                  <TableCell><div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 1.25}rem` }}>{hasChildren ? <Button variant="ghost" size="icon-xs" aria-label={isCollapsed ? '展开子部门' : '折叠子部门'} onClick={() => id && toggleCollapsed(id)}><ChevronRight className={`size-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} /></Button> : <span className="inline-block size-6" />}<span className="font-medium">{department.name || '-'}</span>{depth === 0 && <Badge variant="outline" className="ml-1">根部门</Badge>}</div></TableCell>
                  <TableCell>{relationCount(department.leader)}</TableCell><TableCell>{relationCount(department.positions)}</TableCell><TableCell>{relationCount(department.department_users)}</TableCell><TableCell>{formatDate(department.created_at)}</TableCell><TableCell>{formatDate(department.updated_at)}</TableCell>
                  <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => openCreate(department)}><Plus className="size-3.5" aria-hidden="true" />子部门</Button><Button variant="ghost" size="sm" onClick={() => { setDetails(department); setDetailsOpen(true) }}><Eye className="size-3.5" aria-hidden="true" />详情</Button><Button variant="ghost" size="sm" onClick={() => openEdit(department)}><Pencil className="size-3.5" aria-hidden="true" />编辑</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => id && void removeDepartments([id])}><Trash2 className="size-3.5" aria-hidden="true" />删除</Button></div></TableCell>
                </TableRow>
              })}
              {!rows.length && <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">{loading ? '加载中…' : '暂无部门数据'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{form.id ? '编辑部门' : '新增部门'}</DialogTitle><DialogDescription>部门保存后会立即影响数据权限和组织树。</DialogDescription></DialogHeader><FieldGroup className="gap-4"><Field><FieldLabel htmlFor="department-name">部门名称</FieldLabel><Input id="department-name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="例如：研发中心" /></Field><Field><FieldLabel>上级部门</FieldLabel><Select value={String(form.parent_id)} onValueChange={value => setForm(current => ({ ...current, parent_id: Number(value) }))}><SelectTrigger><SelectValue placeholder="顶级部门" /></SelectTrigger><SelectContent><SelectItem value="0">顶级部门</SelectItem>{parentOptions.map(row => <SelectItem key={row.department.id} value={String(row.department.id)}>{'　'.repeat(row.depth)}{row.department.name}</SelectItem>)}</SelectContent></Select></Field></FieldGroup><DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button><Button onClick={() => void submitForm()} disabled={loading}>保存</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><UsersRound className="size-5" aria-hidden="true" />{details?.name || '部门'}详情</DialogTitle><DialogDescription>查看部门负责人、岗位和当前关联用户。</DialogDescription></DialogHeader><div className="grid gap-4 md:grid-cols-3"><div className="rounded-md border p-3"><p className="text-sm text-muted-foreground">负责人</p><p className="mt-2 font-medium">{relationCount(details?.leader)} 人</p><div className="mt-2 space-y-1 text-sm">{departmentUsers(details?.leader).map(user => <p key={user.id || user.username}>{user.nickname || user.username || '-'}</p>)}</div></div><div className="rounded-md border p-3"><p className="text-sm text-muted-foreground">岗位</p><p className="mt-2 font-medium">{relationCount(details?.positions)} 个</p><div className="mt-2 space-y-1 text-sm">{details?.positions?.map(position => <p key={position.id || position.name}>{position.name || '-'}</p>)}</div></div><div className="rounded-md border p-3"><p className="text-sm text-muted-foreground">部门用户</p><p className="mt-2 font-medium">{relationCount(details?.department_users)} 人</p><div className="mt-2 space-y-1 text-sm">{departmentUsers(details?.department_users).map(user => <p key={user.id || user.username}>{user.nickname || user.username || '-'}</p>)}</div></div></div><DialogFooter><Button onClick={() => setDetailsOpen(false)}>关闭</Button></DialogFooter></DialogContent></Dialog>
    </>
  )
}
