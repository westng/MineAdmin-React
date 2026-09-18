import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { PermissionGate } from '@/hooks/framework/use-permission'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MaIconPicker } from '@/components/ma-icon-picker'
import { MaIcon } from '@/components/ma-icon'
import { CheckCircle2, CircleDot, FileCog, Plus, RefreshCw, Save, Trash2, X, XCircle } from 'lucide-react'
import { hotkeysCoreFeature, syncDataLoaderFeature, type ItemInstance } from '@headless-tree/core'
import { useTree } from '@headless-tree/react'
import { useTable, type ColumnDef } from '@tanstack/react-table'
import { DataGrid, dataGridFeatures, type DataGridFeatures } from '@/components/reui/data-grid/data-grid'
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header'
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area'
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table'
import { Badge } from '@/components/reui/primitives/badge'
import { Button } from '@/components/reui/primitives/button'
import { Card, CardContent } from '@/components/reui/primitives/card'
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
import { ScrollArea } from '@/components/reui/primitives/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/reui/primitives/select'
import * as menuApi from '@/modules/base/permission/menu/api/menu'
import type { MenuVo } from '@/modules/base/permission/menu/api/menu'
import { Tree, TreeItem, TreeItemLabel } from '@/components/reui/tree'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { getMenuLabel, getMenuType, isVisibleMenu } from '@/router/dynamic-menu'
import { MenuCascader } from '@/modules/base/permission/menu/components/menu-cascader'
import { useRuntime } from '@/hooks/framework/use-runtime'
import { Frame, FramePanel, FrameHeader, FrameTitle, FrameDescription } from '@/components/reui/frame'

const tx = createTextTranslator('base.permission.menu.ui')

type ButtonPermission = {
  id?: number
  title: string
  code: string
  i18n?: string
}

type MenuForm = {
  id?: number
  parent_id?: number
  title: string
  i18n: string
  name: string
  path: string
  component: string
  redirect: string
  type: string
  icon: string
  link: string
  sort: number
  status: number
  btnPermission: ButtonPermission[]
}

const emptyForm: MenuForm = {
  title: '',
  i18n: '',
  name: '',
  path: '',
  component: '',
  redirect: '',
  type: 'M',
  icon: '',
  link: '',
  sort: 0,
  status: 1,
  btnPermission: [],
}

function toForm(menu: MenuVo): MenuForm {
  const btnPermission: ButtonPermission[] = []
  if (menu.children && menu.children.length > 0) {
    menu.children
      .filter(child => getMenuType(child) === 'B')
      .forEach(btn => {
        btnPermission.push({
          id: btn.id,
          title: btn.meta?.title || '',
          code: btn.name || '',
          i18n: btn.meta?.i18n || '',
        })
      })
  }

  return {
    id: menu.id,
    parent_id: menu.parent_id,
    title: menu.meta?.title || menu.name || '',
    i18n: menu.meta?.i18n || '',
    name: menu.name || '',
    path: menu.path || menu.route || '',
    component: menu.component || '',
    redirect: menu.redirect || '',
    type: getMenuType(menu),
    icon: menu.icon || menu.meta?.icon || '',
    link: typeof menu.meta?.link === 'string' ? menu.meta.link : '',
    sort: menu.sort || 0,
    status: menu.status || 1,
    btnPermission,
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
    meta: { title: form.title, i18n: form.i18n, type: form.type, icon: form.icon, link: form.link || undefined },
    btnPermission: form.btnPermission.map(button => ({
      ...button,
      type: 'B',
      i18n: button.i18n || '',
    })),
  }
}

type MenuTreeItem = {
  label: string
  menu?: MenuVo
  type?: string
  children?: string[]
}

function MenuDataIcon({ menu }: { menu?: MenuVo }) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const icon = menu?.icon || menu?.meta?.icon

  if (!icon) {
    return <CircleDot className="pointer-events-none size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  }

  return <MaIcon name={icon} className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
}

function createMenuTreeData(menus: MenuVo[]) {
  const rootItemId = 'menu-root'
  const items: Record<string, MenuTreeItem> = { [rootItemId]: { label: tx('菜单'), children: [] } }
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

function MenuTree({
  menus,
  selectedId,
  onSelect,
}: {
  menus: MenuVo[]
  selectedId?: number
  onSelect: (menu: MenuVo) => void
}) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const treeData = useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return createMenuTreeData(menus)
  }, [menus, localeRevision])
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

  useEffect(() => {
    tree.rebuildTree()
    const focusedId = tree.getState().focusedItem
    if (focusedId && !treeData.items[focusedId]) tree.getItems()[0]?.setFocused()
  }, [tree, treeData])

  return (
    <Tree
      className="relative before:absolute before:inset-0 before:-ms-1 before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)))]"
      indent={20}
      tree={tree}
      toggleIconType="chevron"
    >
      {tree.getItems().map(item => {
        // 刷新后的首帧可能仍有已删除节点，等待 effect 重建树结构。
        if (!treeData.items[item.getId()]) return null
        const menu = item.getItemData().menu
        const isSelected = menu?.id !== undefined && menu.id === selectedId

        return (
          <TreeItem key={item.getId()} item={item} className="w-full text-left">
            <TreeItemLabel
              className={`w-full justify-start text-left${isSelected ? ' bg-accent text-accent-foreground' : ''}`}
            >
              <span className="flex min-w-0 w-full items-center justify-start gap-2 text-left">
                <MenuDataIcon menu={menu} />
                <span className="min-w-0 flex-1 truncate">{item.getItemName()}</span>
                {menu && (
                  <Badge variant="outline" className="text-[10px]">
                    {getMenuType(menu)}
                  </Badge>
                )}
              </span>
            </TreeItemLabel>
          </TreeItem>
        )
      })}
    </Tree>
  )
}

function flattenMenus(menus: MenuVo[], result: MenuVo[] = []) {
  menus.forEach(menu => {
    result.push(menu)
    if (menu.children) flattenMenus(menu.children, result)
  })
  return result
}

type ButtonPermissionRow = ButtonPermission & {
  onUpdate: (field: 'title' | 'code', value: string) => void
  onRemove: () => void
}

const buttonPermissionColumns: ColumnDef<DataGridFeatures, ButtonPermissionRow, unknown>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => <DataGridColumnHeader column={column} title={tx('按钮名称')} />,
    cell: ({ row }) => (
      <Input
        value={row.original.title}
        onChange={event => row.original.onUpdate('title', event.target.value)}
        placeholder={tx('例如：菜单列表')}
        aria-label={tx('第 {0} 项按钮名称', { '0': row.index + 1 })}
      />
    ),
    size: 200,
    meta: {
      headerClassName: 'ps-(--frame-panel-px)',
      cellClassName: 'overflow-visible ps-(--frame-panel-px)',
    },
  },
  {
    accessorKey: 'code',
    header: ({ column }) => <DataGridColumnHeader column={column} title={tx('按钮编码')} />,
    cell: ({ row }) => (
      <Input
        value={row.original.code}
        onChange={event => row.original.onUpdate('code', event.target.value)}
        placeholder={tx('例如：permission:menu:index')}
        aria-label={tx('第 {0} 项按钮编码', { '0': row.index + 1 })}
      />
    ),
    size: 300,
    meta: { cellClassName: 'overflow-visible' },
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">{tx('操作')}</span>,
    cell: ({ row }) => (
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={row.original.onRemove}
        aria-label={tx('删除{0}', { '0': row.original.title || `第 ${row.index + 1} 项按钮权限` })}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    ),
    size: 50,
    meta: {
      headerClassName: 'pe-(--frame-panel-header-px)',
      cellClassName: 'overflow-visible pe-(--frame-panel-px)',
    },
  },
]

function ButtonPermissionTable({
  value,
  onChange,
}: {
  value: ButtonPermission[]
  onChange: (value: ButtonPermission[]) => void
}) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  function addButton() {
    onChange([...value, { title: '', code: '' }])
  }

  function removeButton(index: number) {
    const updated = [...value]
    updated.splice(index, 1)
    onChange(updated)
  }

  function updateButton(index: number, field: 'title' | 'code', fieldValue: string) {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: fieldValue }
    onChange(updated)
  }

  const rows: ButtonPermissionRow[] = value.map((button, index) => ({
    ...button,
    onUpdate: (field, fieldValue) => updateButton(index, field, fieldValue),
    onRemove: () => removeButton(index),
  }))
  const table = useTable<DataGridFeatures, ButtonPermissionRow>({
    features: dataGridFeatures,
    data: rows,
    columns: buttonPermissionColumns,
    getRowId: (row, index) => (row.id === undefined ? `new-${index}` : String(row.id)),
    manualPagination: true,
    enableSorting: false,
    enableRowSelection: false,
    enableColumnResizing: false,
  })

  return (
    <Frame dense className="mt-5 w-full min-w-0">
      <FrameHeader className="flex-row items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <FrameTitle>{tx('按钮权限')}</FrameTitle>
            <Badge variant="secondary">
              {value.length} {tx('项')}
            </Badge>
          </div>
          <FrameDescription>{tx('配置按钮名称和对应的权限编码。')}</FrameDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addButton}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          {tx('新增按钮')}
        </Button>
      </FrameHeader>
      <FramePanel className="p-0 shadow-none">
        <DataGrid
          table={table}
          recordCount={value.length}
          tableLayout={{ dense: true, width: 'fixed' }}
          emptyMessage={tx('暂无按钮权限，点击右上角“新增按钮”添加。')}
        >
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </DataGrid>
      </FramePanel>
    </Frame>
  )
}

export default function PermissionMenuPageView() {
  const { components } = useRuntime()
  const localeRevision = useLocaleRevision()
  void localeRevision

  const [menus, setMenus] = useState<MenuVo[]>([])
  const [selected, setSelected] = useState<MenuVo | null>(null)
  const [form, setForm] = useState<MenuForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isButton = form.type === 'B'

  const loadMenus = useCallback(async (selectedId?: number) => {
    setLoading(true)
    try {
      const response = await menuApi.page()
      const nextMenus = Array.isArray(response.data.data) ? response.data.data : []
      setMenus(nextMenus)
      if (selectedId !== undefined) {
        const currentMenu = flattenMenus(nextMenus).find(menu => menu.id === selectedId)
        setSelected(currentMenu || null)
        setForm(currentMenu ? toForm(currentMenu) : emptyForm)
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : tx('菜单加载失败'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMenus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadMenus])

  function selectMenu(menu: MenuVo) {
    setSelected(menu)
    setForm(toForm(menu))
  }

  function createMenu(parent?: MenuVo) {
    setSelected(null)
    setForm({ ...emptyForm, parent_id: parent?.id || 0 })
  }

  async function saveMenu() {
    if (!form.title || !form.name || (form.type !== 'B' && !form.path)) {
      setNotice(isButton ? tx('按钮名称和权限编码不能为空') : tx('菜单名称、编码和菜单路由不能为空'))
      return
    }
    setLoading(true)
    try {
      const response = form.id ? await menuApi.save(form.id, toPayload(form)) : await menuApi.create(toPayload(form))
      if (response.data.code !== 200) throw new Error(response.data.message || tx('保存失败'))
      setNotice(tx('{0}{1}成功', { '0': isButton ? '按钮权限' : '菜单', '1': form.id ? '更新' : '创建' }))
      await loadMenus(form.id)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : tx('菜单保存失败'))
    } finally {
      setLoading(false)
    }
  }

  async function deleteMenu() {
    if (!form.id) return
    setLoading(true)
    try {
      const response = await menuApi.deleteByIds([form.id])
      if (response.data.code !== 200) throw new Error(response.data.message || tx('删除失败'))
      setNotice(tx('{0}删除成功', { '0': isButton ? '按钮权限' : '菜单' }))
      setDeleteOpen(false)
      setSelected(null)
      setForm(emptyForm)
      await loadMenus()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : tx('菜单删除失败'))
    } finally {
      setLoading(false)
    }
  }

  const parentMenus = useMemo(() => menus.filter(menu => isVisibleMenu(menu) && getMenuType(menu) === 'M'), [menus])
  const componentValid = useMemo(() => {
    if (!form.component || form.type === 'B') return null
    return components.has(form.component)
  }, [components, form.component, form.type])

  useHeaderActions(
    <>
      <Button variant="outline" onClick={() => void loadMenus(selected?.id)} disabled={loading}>
        <RefreshCw className="size-4" aria-hidden="true" />
        {tx('刷新')}
      </Button>
      <PermissionGate permission="permission:menu:create">
        <Button onClick={() => createMenu()}>
          <Plus className="size-4" aria-hidden="true" />
          {tx('新增顶级菜单')}
        </Button>
      </PermissionGate>
    </>,
  )

  return (
    <>
      <Card className="flex min-h-0 flex-1 flex-col shadow-none">
        <CardContent className="grid min-h-0 flex-1 gap-0 p-0 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]">
          <aside className="min-h-0 flex flex-col border-b p-4 lg:border-r lg:border-b-0">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <span className="text-sm font-medium">{tx('菜单树')}</span>
              <Badge variant="outline">{flattenMenus(menus).length}</Badge>
            </div>
            {loading && !menus.length ? (
              <p className="text-sm text-muted-foreground">{tx('加载中…')}</p>
            ) : menus.length ? (
              <ScrollArea className="min-h-0 flex-1 pr-2">
                <MenuTree
                  key={menus.map(menu => menu.id || menu.name || menu.path).join('|')}
                  menus={menus}
                  selectedId={selected?.id}
                  onSelect={selectMenu}
                />
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">{tx('暂无菜单数据。')}</p>
            )}
          </aside>
          <section className="min-h-0 overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  {`${form.id ? tx('编辑') : tx('新增')}${isButton ? tx('按钮权限') : tx('菜单')}`}
                  <Badge variant="outline">{form.type}</Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isButton
                    ? tx('配置按钮名称、权限编码和所属菜单，用于控制操作权限。')
                    : tx('菜单保存后会同步影响登录用户的动态路由。')}
                </p>
              </div>
              <div className="flex gap-2">
                {form.id && (
                  <PermissionGate permission="permission:menu:delete">
                    <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="size-4" aria-hidden="true" />
                      {tx('删除')}
                    </Button>
                  </PermissionGate>
                )}
                <PermissionGate permission={form.id ? 'permission:menu:save' : 'permission:menu:create'}>
                  <Button size="sm" onClick={() => void saveMenu()} disabled={loading}>
                    <Save className="size-4" aria-hidden="true" />
                    {tx('保存')}
                  </Button>
                </PermissionGate>
              </div>
            </div>
            {notice && (
              <div className="mb-4 flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <span>{notice}</span>
                <Button variant="ghost" size="icon-xs" aria-label={tx('关闭提示')} onClick={() => setNotice('')}>
                  <X className="size-3" />
                </Button>
              </div>
            )}
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="menu-title">{isButton ? tx('按钮名称') : tx('菜单名称')}</FieldLabel>
                <Input
                  id="menu-title"
                  value={form.title}
                  onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                  placeholder={isButton ? tx('例如：查看用户') : tx('例如：用户管理')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="menu-name">{isButton ? tx('权限编码') : tx('菜单编码')}</FieldLabel>
                <Input
                  id="menu-name"
                  value={form.name}
                  onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                  placeholder={isButton ? 'permission:user:index' : 'permission:user'}
                />
              </Field>
              <Field>
                <FieldLabel>{tx('父级菜单')}</FieldLabel>
                <MenuCascader
                  menus={parentMenus}
                  value={form.parent_id}
                  onChange={value => setForm(current => ({ ...current, parent_id: value }))}
                  excludeId={form.id}
                />
              </Field>
              <Field>
                <FieldLabel>{tx('菜单类型')}</FieldLabel>
                <Select
                  value={form.type}
                  onValueChange={value => setForm(current => ({ ...current, type: value || 'M' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">{tx('菜单（M）')}</SelectItem>
                    <SelectItem value="L">{tx('外链（L）')}</SelectItem>
                    <SelectItem value="I">{tx('内嵌（I）')}</SelectItem>
                    <SelectItem value="B">{tx('按钮（B）')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.type !== 'B' && (
                <Field>
                  <FieldLabel>{tx('路由地址')}</FieldLabel>
                  <Input
                    value={form.path}
                    onChange={event => setForm(current => ({ ...current, path: event.target.value }))}
                    placeholder="/permission/user"
                  />
                </Field>
              )}
              {form.type === 'M' && (
                <Field>
                  <FieldLabel>{tx('组件路径')}</FieldLabel>
                  <div className="relative">
                    <Input
                      value={form.component}
                      onChange={event => setForm(current => ({ ...current, component: event.target.value }))}
                      placeholder="base/permission/user/views/index"
                    />
                    {form.component &&
                      (componentValid ? (
                        <CheckCircle2
                          className="text-green-600 dark:text-green-400 absolute right-3 top-1/2 size-4 -translate-y-1/2"
                          aria-hidden="true"
                        />
                      ) : (
                        <XCircle
                          className="text-destructive absolute right-3 top-1/2 size-4 -translate-y-1/2"
                          aria-hidden="true"
                        />
                      ))}
                  </div>
                </Field>
              )}
              {form.type !== 'B' && (
                <Field>
                  <FieldLabel htmlFor="menu-icon">{tx('图标')}</FieldLabel>
                  <MaIconPicker
                    id="menu-icon"
                    value={form.icon}
                    onChange={icon => setForm(current => ({ ...current, icon }))}
                    disabled={loading}
                  />
                </Field>
              )}
              {(form.type === 'L' || form.type === 'I') && (
                <Field>
                  <FieldLabel>{tx('外链地址')}</FieldLabel>
                  <Input
                    value={form.link}
                    onChange={event => setForm(current => ({ ...current, link: event.target.value }))}
                    placeholder="https://example.com"
                  />
                </Field>
              )}
              {form.type === 'M' && (
                <Field>
                  <FieldLabel>{tx('重定向')}</FieldLabel>
                  <Input
                    value={form.redirect}
                    onChange={event => setForm(current => ({ ...current, redirect: event.target.value }))}
                    placeholder={tx('默认子路由')}
                  />
                </Field>
              )}
              <Field>
                <FieldLabel>{tx('排序')}</FieldLabel>
                <Input
                  type="number"
                  value={String(form.sort)}
                  onChange={event => setForm(current => ({ ...current, sort: Number(event.target.value) }))}
                />
              </Field>
              <Field>
                <FieldLabel>{tx('状态')}</FieldLabel>
                <Select
                  value={String(form.status)}
                  onValueChange={value => setForm(current => ({ ...current, status: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tx('启用')}</SelectItem>
                    <SelectItem value="2">{tx('禁用')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            {form.type === 'M' && (
              <ButtonPermissionTable
                value={form.btnPermission}
                onChange={btnPermission => setForm(current => ({ ...current, btnPermission }))}
              />
            )}
            {form.type === 'M' && (
              <div className="mt-5 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                <FileCog className="mr-2 inline size-4" aria-hidden="true" />
                {tx('组件路径需要与 React `src/modules/**/views` 下的文件匹配；找不到时会显示安全占位页。')}
              </div>
            )}
          </section>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tx('删除')}
              {isButton ? tx('按钮权限') : tx('菜单')}
            </DialogTitle>
            <DialogDescription>
              {isButton
                ? tx('删除后，关联角色将失去该按钮权限，确认继续吗？')
                : tx('删除菜单可能影响其子菜单和用户权限，确认继续吗？')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tx('取消')}
            </Button>
            <PermissionGate permission="permission:menu:delete">
              <Button variant="destructive" onClick={() => void deleteMenu()}>
                {tx('确认删除')}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
