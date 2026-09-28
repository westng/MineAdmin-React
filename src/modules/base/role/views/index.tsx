import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createRoleApi } from '@/modules/base/role/api/role'
import { createApi as createMenuApi } from '@/modules/base/menu/api/menu'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { PermissionGate } from '@/provider/access/permission-gate'
import { usePermission } from '@/hooks/auth/use-permission'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { Checkbox } from '@/components/reui/primitives/checkbox'
import { MaDialog, useMaFormDialog, useMaConfirm } from '@/components/ma-dialog'
import { MaForm } from '@/components/ma-form'
import { Input } from '@/components/reui/primitives/input'
import { type RoleVo } from '@/modules/base/role/api/role'
import { type MenuVo } from '@/modules/base/menu/api/menu'
import { extractList } from '@/utils/api-data'
import { getMenuLabel } from '@/router/navigation/menu'

import type { MaProTableExpose } from '@/components/ma-pro-table'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { useToast } from '@/components/reui/use-toast'
import RoleProTable from './components/RoleProTable'

import { getFormItems, toRoleForm, type RoleForm } from './data/getFormItems'

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
    const searchableText = [getMenuLabel(menu), menu.name, menu.path, menu.route]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (searchableText.includes(query)) return [{ ...menu, children: menu.children ?? [] }]
    return children.length ? [{ ...menu, children }] : []
  })
}

function PermissionMenuTree({
  menus,
  permissionNames,
  onToggle,
}: {
  menus: MenuVo[]
  permissionNames: string[]
  onToggle: (name: string) => void
}) {
  const tx = useTextTranslator('base.permission.role.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

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
              {children.length > 0 ? (
                <button
                  type="button"
                  className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-background"
                  aria-label={
                    collapsed ? tx('展开{0}', { '0': getMenuLabel(menu) }) : tx('收起{0}', { '0': getMenuLabel(menu) })
                  }
                  aria-expanded={!collapsed}
                  onClick={() =>
                    setCollapsedKeys(current => {
                      const next = new Set(current)
                      if (next.has(key)) next.delete(key)
                      else next.add(key)
                      return next
                    })
                  }
                >
                  {collapsed ? (
                    <ChevronRight className="size-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-4" aria-hidden="true" />
                  )}
                </button>
              ) : (
                <span className="size-5 shrink-0" aria-hidden="true" />
              )}
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <Checkbox
                  checked={Boolean(menu.name && permissionNames.includes(menu.name))}
                  onCheckedChange={() => menu.name && onToggle(menu.name)}
                />
                <span className={`min-w-0 flex-1 truncate ${children.length ? 'font-medium' : ''}`}>
                  {getMenuLabel(menu)}
                </span>
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
  const tx = useTextTranslator('base.permission.role.ui')
  function responseMessage(response: { data?: { message?: string } }) {
    return response.data?.message || tx('操作失败')
  }

  const { create, deleteByIds, getRolePermission, setRolePermission, save } = useRuntimeFactory(createRoleApi)

  const { page: pageMenus } = useRuntimeFactory(createMenuApi)

  const localeRevision = useLocaleRevision()
  void localeRevision

  const tableRef = useRef<MaProTableExpose<RoleVo>>(null)
  const { toast } = useToast()
  const { hasAuth } = usePermission()
  const [menus, setMenus] = useState<MenuVo[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [permissionOpen, setPermissionOpen] = useState(false)
  const [permissionRole, setPermissionRole] = useState<RoleVo | null>(null)
  const [permissionNames, setPermissionNames] = useState<string[]>([])
  const [permissionLoading, setPermissionLoading] = useState(false)
  const [permissionReady, setPermissionReady] = useState(false)
  const [permissionSaving, setPermissionSaving] = useState(false)
  const [permissionSearch, setPermissionSearch] = useState('')
  const permissionRequestRef = useRef(0)
  const permissionSavingRef = useRef(false)
  useEffect(
    () => () => {
      permissionRequestRef.current += 1
    },
    [],
  )

  const refreshRoles = useCallback(async () => {
    tableRef.current?.getTableRef()?.clearSelection()
    await tableRef.current?.refresh()
  }, [])
  const handleSelectionChange = useCallback((rows: RoleVo[]) => {
    setSelectedIds(rows.flatMap(row => (row.id ? [row.id] : [])))
  }, [])

  const editor = useMaFormDialog<RoleForm, RoleVo | null>({
    defaultValues: () => toRoleForm(null),
    toValues: toRoleForm,
    canSubmit: role => hasAuth(role?.id ? 'permission:role:update' : 'permission:role:save'),
    formOptions: { layout: 'grid', grid: { columns: 2, gap: '1rem' } },
    onSubmit: async (values, role) => {
      const response = role?.id ? await save(role.id, values) : await create(values)
      if (response.data.code !== 200) throw new Error(responseMessage(response))
    },
    onSuccess: async (_values, role) => {
      toast.success(role?.id ? tx('角色更新成功') : tx('角色创建成功'))
      await refreshRoles()
    },
    onError: error => toast.error(error instanceof Error ? error.message : tx('角色保存失败')),
  })
  const confirm = useMaConfirm({
    onError: error => toast.error(error instanceof Error ? error.message : tx('角色删除失败')),
  })
  const openCreate = () => editor.open(null)

  useHeaderActions(
    <PermissionGate permission="permission:role:save">
      <Button onClick={openCreate}>
        <Plus aria-hidden="true" />
        {tx('新增角色')}
      </Button>
    </PermissionGate>,
  )

  async function removeRoles(ids: number[]) {
    if (!ids.length || !hasAuth('permission:role:delete')) return
    confirm.open({
      title: tx('删除角色'),
      description: tx('确认删除 {0} 个角色吗？', { '0': ids.length }),
      onConfirm: async () => {
        if (!hasAuth('permission:role:delete')) return false
        const response = await deleteByIds(ids)
        if (response.data.code !== 200) throw new Error(responseMessage(response))
        toast.success(tx('角色删除成功'))
        await refreshRoles()
      },
    })
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
      setPermissionNames(
        extractList<{ name?: string }>(permissionResponse.data.data)
          .map(item => item.name)
          .filter((name): name is string => Boolean(name)),
      )
      setPermissionReady(true)
    } catch (error) {
      if (requestId === permissionRequestRef.current)
        toast.error(error instanceof Error ? error.message : tx('权限数据加载失败'))
    } finally {
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
      toast.success(tx('角色权限更新成功'))
    } catch (error) {
      if (requestId !== permissionRequestRef.current) return
      toast.error(error instanceof Error ? error.message : tx('角色权限更新失败'))
    } finally {
      if (requestId === permissionRequestRef.current) {
        permissionSavingRef.current = false
        setPermissionSaving(false)
      }
    }
  }

  function togglePermission(name: string) {
    if (permissionSavingRef.current) return
    setPermissionNames(current => (current.includes(name) ? current.filter(item => item !== name) : [...current, name]))
  }

  const filteredPermissionMenus = filterMenuTree(menus, permissionSearch)

  return (
    <>
      <RoleProTable
        tableRef={tableRef}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onCreate={openCreate}
        onEdit={editor.open}
        onPermissions={openPermissions}
        onDelete={removeRoles}
      />
      <MaDialog
        {...editor.dialogProps}
        title={editor.data?.id ? tx('编辑角色') : tx('新增角色')}
        description={tx('角色编码用于权限识别，保存后可继续配置菜单权限。')}
        okText={tx('保存')}
        cancelText={tx('取消')}
        showFullscreenButton={false}
        contentClassName="sm:max-w-xl"
      >
        <MaForm key={editor.formKey} {...editor.formProps} items={getFormItems(tx, Boolean(editor.data?.id))} />
      </MaDialog>
      <MaDialog
        open={permissionOpen}
        onOpenChange={open => {
          if (!permissionSavingRef.current) {
            if (open) setPermissionOpen(true)
            else closePermissions()
          }
        }}
        title={tx('配置菜单权限')}
        description={`${permissionRole?.name || tx('当前角色')} ${tx('可以访问的菜单。')}`}
        showFullscreenButton={false}
        contentClassName="sm:max-w-2xl"
        footer={false}
      >
        {permissionLoading && <p className="text-sm text-muted-foreground">{tx('正在加载权限数据…')}</p>}
        {!permissionLoading && !permissionReady && (
          <p className="text-sm text-destructive">{tx('权限数据加载失败，请关闭后重试。')}</p>
        )}
        {permissionReady && (
          <>
            <div className="relative">
              <Input
                className="pr-9"
                value={permissionSearch}
                onChange={event => setPermissionSearch(event.target.value)}
                placeholder={tx('搜索菜单名称、路径或权限编码')}
                aria-label={tx('搜索菜单权限')}
              />
              {permissionSearch && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setPermissionSearch('')}
                  aria-label={tx('清除菜单搜索')}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="max-h-[55vh] overflow-y-auto rounded-md border p-3">
              {filteredPermissionMenus.length ? (
                <PermissionMenuTree
                  key={permissionSearch || 'all'}
                  menus={filteredPermissionMenus}
                  permissionNames={permissionNames}
                  onToggle={togglePermission}
                />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {menus.length ? tx('没有匹配的菜单权限。') : tx('暂无可配置菜单。')}
                </p>
              )}
            </div>
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={closePermissions} disabled={permissionSaving}>
            {tx('取消')}
          </Button>
          <PermissionGate permission="permission:role:setMenu">
            <Button
              disabled={permissionLoading || permissionSaving || !permissionReady || !permissionRole?.id}
              onClick={() => void savePermissions()}
            >
              {permissionSaving ? tx('保存中…') : tx('保存权限')}
            </Button>
          </PermissionGate>
        </div>
      </MaDialog>
      <MaDialog {...confirm.dialogProps} cancelText={tx('取消')} />
    </>
  )
}
