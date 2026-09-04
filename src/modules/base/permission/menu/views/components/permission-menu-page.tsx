import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { CircleDot, FileCog, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { hotkeysCoreFeature, syncDataLoaderFeature, type ItemInstance } from '@headless-tree/core'
import { useTree } from '@headless-tree/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as menuApi from '@/modules/base/permission/menu/api/menu'
import type { MenuVo } from '@/modules/base/permission/menu/api/menu'
import { Tree, TreeItem, TreeItemLabel } from '@/components/reui/tree'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { getMenuLabel, getMenuType, isVisibleMenu } from '@/router/dynamic-menu'

type MenuForm = {
  id?: number
  parent_id?: number
  title: string
  name: string
  path: string
  component: string
  redirect: string
  type: string
  icon: string
  link: string
  sort: number
  status: number
}

const emptyForm: MenuForm = { title: '', name: '', path: '', component: '', redirect: '', type: 'M', icon: '', link: '', sort: 0, status: 1 }

function toForm(menu: MenuVo): MenuForm {
  return {
    id: menu.id,
    parent_id: menu.parent_id,
    title: menu.meta?.title || menu.name || '',
    name: menu.name || '',
    path: menu.path || menu.route || '',
    component: menu.component || '',
    redirect: menu.redirect || '',
    type: getMenuType(menu),
    icon: menu.icon || menu.meta?.icon || '',
    link: typeof menu.meta?.link === 'string' ? menu.meta.link : '',
    sort: menu.sort || 0,
    status: menu.status || 1,
  }
}

function toPayload(form: MenuForm): MenuVo {
  return {
    id: form.id,
    parent_id: form.parent_id || 0,
    name: form.name,
    path: form.path,
    route: form.path,
    component: form.component,
    redirect: form.redirect,
    type: form.type,
    icon: form.icon,
    status: form.status,
    sort: form.sort,
    meta: { title: form.title, type: form.type, icon: form.icon, link: form.link || undefined },
  }
}

type MenuTreeItem = {
  label: string
  menu?: MenuVo
  type?: string
  children?: string[]
}

function MenuDataIcon({ menu }: { menu?: MenuVo }) {
  const icon = menu?.icon || menu?.meta?.icon

  if (!icon) {
    return <CircleDot className="pointer-events-none size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  }

  return <Icon icon={icon} className="pointer-events-none size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
}

function createMenuTreeData(menus: MenuVo[]) {
  const rootItemId = 'menu-root'
  const items: Record<string, MenuTreeItem> = { [rootItemId]: { label: '菜单', children: [] } }
  const expandedItems: string[] = []

  function addMenu(menu: MenuVo, path: number[]): string {
    const itemId = `menu-${menu.id ?? path.join('-')}`
    const children = (menu.children || []).map((child, index) => addMenu(child, [...path, index]))
    items[itemId] = { label: getMenuLabel(menu), menu, type: getMenuType(menu), children }
    return itemId
  }

  items[rootItemId].children = menus.map((menu, index) => addMenu(menu, [index]))
  return { rootItemId, items, expandedItems }
}

function MenuTree({ menus, selectedId, onSelect }: { menus: MenuVo[]; selectedId?: number; onSelect: (menu: MenuVo) => void }) {
  const treeData = useMemo(() => createMenuTreeData(menus), [menus])
  const tree = useTree<MenuTreeItem>({
    initialState: { expandedItems: treeData.expandedItems },
    indent: 20,
    rootItemId: treeData.rootItemId,
    getItemName: item => item.getItemData().label,
    isItemFolder: item => Boolean(item.getItemData().children?.length),
    onPrimaryAction: (item: ItemInstance<MenuTreeItem>) => {
      const menu = item.getItemData().menu
      if (menu) onSelect(menu)
    },
    dataLoader: {
      getItem: itemId => treeData.items[itemId],
      getChildren: itemId => treeData.items[itemId]?.children ?? [],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature],
  })

  return (
    <Tree
      className="relative before:absolute before:inset-0 before:-ms-1 before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)))]"
      indent={20}
      tree={tree}
      toggleIconType="chevron"
    >
      {tree.getItems().map(item => {
        const menu = item.getItemData().menu
        const isSelected = menu?.id !== undefined && menu.id === selectedId

        return (
          <TreeItem key={item.getId()} item={item} className="w-full text-left">
            <TreeItemLabel className={`w-full justify-start text-left${isSelected ? ' bg-accent text-accent-foreground' : ''}`}>
              <span className="flex min-w-0 w-full items-center justify-start gap-2 text-left">
                <MenuDataIcon menu={menu} />
                <span className="min-w-0 flex-1 truncate">{item.getItemName()}</span>
                {menu && <Badge variant="outline" className="text-[10px]">{getMenuType(menu)}</Badge>}
              </span>
            </TreeItemLabel>
          </TreeItem>
        )
      })}
    </Tree>
  )
}

function flattenMenus(menus: MenuVo[], result: MenuVo[] = []) {
  menus.forEach(menu => { result.push(menu); if (menu.children) flattenMenus(menu.children, result) })
  return result
}

export default function PermissionMenuPageView() {
  const [menus, setMenus] = useState<MenuVo[]>([])
  const [selected, setSelected] = useState<MenuVo | null>(null)
  const [form, setForm] = useState<MenuForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const loadMenus = useCallback(async () => {
    setLoading(true)
    try {
      const response = await menuApi.page()
      setMenus(Array.isArray(response.data.data) ? response.data.data : [])
    }
    catch (error) { setNotice(error instanceof Error ? error.message : '菜单加载失败') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { const timer = window.setTimeout(() => { void loadMenus() }, 0); return () => window.clearTimeout(timer) }, [loadMenus])

  function selectMenu(menu: MenuVo) {
    setSelected(menu)
    setForm(toForm(menu))
  }

  function createMenu(parent?: MenuVo) {
    setSelected(null)
    setForm({ ...emptyForm, parent_id: parent?.id || 0 })
  }

  async function saveMenu() {
    if (!form.title || !form.name || (form.type !== 'B' && !form.path)) { setNotice('菜单名称、编码和菜单路由不能为空'); return }
    setLoading(true)
    try {
      const response = form.id ? await menuApi.save(form.id, toPayload(form)) : await menuApi.create(toPayload(form))
      if (response.data.code !== 200) throw new Error(response.data.message || '保存失败')
      setNotice(form.id ? '菜单更新成功' : '菜单创建成功')
      await loadMenus()
    }
    catch (error) { setNotice(error instanceof Error ? error.message : '菜单保存失败') }
    finally { setLoading(false) }
  }

  async function deleteMenu() {
    if (!form.id) return
    setLoading(true)
    try {
      const response = await menuApi.deleteByIds([form.id])
      if (response.data.code !== 200) throw new Error(response.data.message || '删除失败')
      setNotice('菜单删除成功')
      setDeleteOpen(false)
      setSelected(null)
      setForm(emptyForm)
      await loadMenus()
    }
    catch (error) { setNotice(error instanceof Error ? error.message : '菜单删除失败') }
    finally { setLoading(false) }
  }

  const parentOptions = flattenMenus(menus).filter(menu => isVisibleMenu(menu) && getMenuType(menu) === 'M' && menu.id !== form.id)

  useHeaderActions(
    <>
      <Button variant="outline" onClick={() => void loadMenus()} disabled={loading}>
        <RefreshCw className="size-4" aria-hidden="true" />刷新
      </Button>
      <Button onClick={() => createMenu()}>
        <Plus className="size-4" aria-hidden="true" />新增顶级菜单
      </Button>
    </>,
  )

  return <div className="flex min-h-0 flex-1 flex-col"><Card className="flex min-h-[600px] flex-1 flex-col shadow-none"><CardContent className="grid min-h-0 flex-1 gap-0 p-0 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]"><aside className="min-h-0 flex flex-col border-b p-4 lg:border-r lg:border-b-0"><div className="mb-3 flex shrink-0 items-center justify-between"><span className="text-sm font-medium">菜单树</span><Badge variant="outline">{flattenMenus(menus).length}</Badge></div>{loading && !menus.length ? <p className="text-sm text-muted-foreground">加载中…</p> : menus.length ? <ScrollArea className="min-h-0 flex-1 pr-2"><MenuTree key={menus.map(menu => menu.id || menu.name || menu.path).join('|')} menus={menus} selectedId={selected?.id} onSelect={selectMenu} /></ScrollArea> : <p className="text-sm text-muted-foreground">暂无菜单数据。</p>}</aside><section className="min-h-0 overflow-y-auto p-4"><div className="mb-4 flex items-center justify-between border-b pb-3"><div><h2 className="flex items-center gap-2 text-base font-semibold">{form.id ? '编辑菜单' : '新增菜单'}<Badge variant="outline">{form.type}</Badge></h2><p className="text-sm text-muted-foreground">菜单保存后会同步影响登录用户的动态路由。</p></div><div className="flex gap-2">{form.id && <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" aria-hidden="true" />删除</Button>}<Button size="sm" onClick={() => void saveMenu()} disabled={loading}><Save className="size-4" aria-hidden="true" />保存</Button></div></div>{notice && <div className="mb-4 flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"><span>{notice}</span><Button variant="ghost" size="icon-xs" aria-label="关闭提示" onClick={() => setNotice('')}><X className="size-3" /></Button></div>}<FieldGroup className="grid gap-4 md:grid-cols-2"><Field><FieldLabel>菜单名称</FieldLabel><Input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="例如：用户管理" /></Field><Field><FieldLabel>菜单编码</FieldLabel><Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="permission:user" /></Field><Field><FieldLabel>父级菜单</FieldLabel><Select value={String(form.parent_id || 0)} onValueChange={value => setForm(current => ({ ...current, parent_id: Number(value) }))}><SelectTrigger><SelectValue placeholder="顶级菜单" /></SelectTrigger><SelectContent><SelectItem value="0">顶级菜单</SelectItem>{parentOptions.map(menu => <SelectItem key={menu.id} value={String(menu.id)}>{getMenuLabel(menu)}</SelectItem>)}</SelectContent></Select></Field><Field><FieldLabel>菜单类型</FieldLabel><Select value={form.type} onValueChange={value => setForm(current => ({ ...current, type: value || 'M' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="M">菜单（M）</SelectItem><SelectItem value="L">外链（L）</SelectItem><SelectItem value="I">内嵌（I）</SelectItem><SelectItem value="B">按钮（B）</SelectItem></SelectContent></Select></Field><Field><FieldLabel>路由地址</FieldLabel><Input value={form.path} onChange={event => setForm(current => ({ ...current, path: event.target.value }))} placeholder="/permission/user" /></Field><Field><FieldLabel>组件路径</FieldLabel><Input value={form.component} onChange={event => setForm(current => ({ ...current, component: event.target.value }))} placeholder="base/permission/user/views/index" /></Field><Field><FieldLabel>图标</FieldLabel><Input value={form.icon} onChange={event => setForm(current => ({ ...current, icon: event.target.value }))} placeholder="lucide:users" /></Field><Field><FieldLabel>外链地址</FieldLabel><Input value={form.link} onChange={event => setForm(current => ({ ...current, link: event.target.value }))} placeholder="仅 L/I 类型使用" /></Field><Field><FieldLabel>重定向</FieldLabel><Input value={form.redirect} onChange={event => setForm(current => ({ ...current, redirect: event.target.value }))} /></Field><Field><FieldLabel>排序</FieldLabel><Input type="number" value={String(form.sort)} onChange={event => setForm(current => ({ ...current, sort: Number(event.target.value) }))} /></Field><Field><FieldLabel>状态</FieldLabel><Select value={String(form.status)} onValueChange={value => setForm(current => ({ ...current, status: Number(value) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">启用</SelectItem><SelectItem value="2">禁用</SelectItem></SelectContent></Select></Field></FieldGroup><div className="mt-5 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground"><FileCog className="mr-2 inline size-4" aria-hidden="true" />组件路径需要与 React `src/modules/**/views` 下的文件匹配；找不到时会显示安全占位页。</div></section></CardContent></Card><Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent><DialogHeader><DialogTitle>删除菜单</DialogTitle><DialogDescription>删除菜单可能影响其子菜单和用户权限，确认继续吗？</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button><Button variant="destructive" onClick={() => void deleteMenu()}>确认删除</Button></DialogFooter></DialogContent></Dialog></div>
}
