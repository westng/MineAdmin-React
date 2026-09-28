import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/hooks/auth/use-session'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createMenuApi } from '@/modules/base/menu/api/menu'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { PermissionGate } from '@/provider/access/permission-gate'
import { usePermission } from '@/hooks/auth/use-permission'
import { useCallback, useMemo, useRef, useState } from 'react'
import { FileCog, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { MaDialog, useMaConfirm } from '@/components/ma-dialog'
import { MaForm, type MaFormExpose } from '@/components/ma-form'
import { Badge } from '@/components/reui/primitives/badge'
import { Button } from '@/components/reui/primitives/button'
import { Card, CardContent } from '@/components/reui/primitives/card'
import { ScrollArea } from '@/components/reui/primitives/scroll-area'

import type { MenuVo } from '@/modules/base/menu/api/menu'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { getMenuType, isVisibleMenu } from '@/router/navigation/menu'
import { useRuntime } from '@/hooks/runtime/use-runtime'

import { emptyForm, toForm, toPayload, flattenMenus, type MenuForm } from './data/menu-form'
import { getFormItems } from './data/getFormItems'
import { MenuTree } from './components/MenuTree'
import { ButtonPermissionTable } from './components/ButtonPermissionTable'

export default function PermissionMenuPageView() {
  const tx = useTextTranslator('base.permission.menu.ui')

  const menuApi = useRuntimeFactory(createMenuApi)

  const runtime = useRuntime()
  const { views } = runtime
  useSession(state => state.sessionVersion)
  const localeRevision = useLocaleRevision()
  void localeRevision

  const listQuery = useQuery(menuApi.page.queryOptions(), runtime.query)
  const menus = useMemo(() => listQuery.data?.data.data ?? [], [listQuery.data])
  const [selected, setSelected] = useState<MenuVo | null>(null)
  const [form, setForm] = useState<MenuForm>(emptyForm)
  const [saving, setLoading] = useState(false)
  const loading = saving || listQuery.isFetching
  const [notice, setNotice] = useState('')
  const formRef = useRef<MaFormExpose<MenuForm>>(null)
  const { hasAuth } = usePermission()
  const confirm = useMaConfirm({
    onError: error => setNotice(error instanceof Error ? error.message : tx('菜单删除失败')),
  })
  const isButton = form.type === 'B'

  const loadMenus = useCallback(
    async (selectedId?: number) => {
      const response = await runtime.query.fetchQuery({ ...menuApi.page.queryOptions(), staleTime: 0 })
      if (selectedId !== undefined) {
        const currentMenu = flattenMenus(response.data.data).find(menu => menu.id === selectedId)
        setSelected(currentMenu || null)
        setForm(currentMenu ? toForm(currentMenu) : emptyForm)
      }
    },
    [runtime, menuApi],
  )

  function selectMenu(menu: MenuVo) {
    if (saving) return
    setSelected(menu)
    setForm(toForm(menu))
  }

  function createMenu(parent?: MenuVo) {
    if (saving) return
    setSelected(null)
    setForm({ ...emptyForm, parent_id: parent?.id || 0 })
  }

  async function saveMenu() {
    if (!hasAuth(form.id ? 'permission:menu:save' : 'permission:menu:create')) return
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

  function deleteMenu() {
    const id = form.id
    if (!id || !hasAuth('permission:menu:delete')) return
    confirm.open({
      title: `${tx('删除')}${isButton ? tx('按钮权限') : tx('菜单')}`,
      description: isButton
        ? tx('删除后，关联角色将失去该按钮权限，确认继续吗？')
        : tx('删除菜单可能影响其子菜单和用户权限，确认继续吗？'),
      okText: tx('确认删除'),
      okVariant: 'destructive',
      onConfirm: async () => {
        if (!hasAuth('permission:menu:delete')) return false
        const response = await menuApi.deleteByIds([id])
        if (response.data.code !== 200) throw new Error(response.data.message || tx('删除失败'))
        setNotice(tx('{0}删除成功', { '0': isButton ? '按钮权限' : '菜单' }))
        setSelected(null)
        setForm(emptyForm)
        await loadMenus()
      },
    })
  }

  const parentMenus = useMemo(() => menus.filter(menu => isVisibleMenu(menu) && getMenuType(menu) === 'M'), [menus])
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
                    <Button variant="destructive" size="sm" onClick={deleteMenu}>
                      <Trash2 className="size-4" aria-hidden="true" />
                      {tx('删除')}
                    </Button>
                  </PermissionGate>
                )}
                <PermissionGate permission={form.id ? 'permission:menu:save' : 'permission:menu:create'}>
                  <Button size="sm" onClick={() => formRef.current?.getElFormRef()?.requestSubmit()} disabled={loading}>
                    <Save className="size-4" aria-hidden="true" />
                    {tx('保存')}
                  </Button>
                </PermissionGate>
              </div>
            </div>
            {(notice || listQuery.error) && (
              <div className="mb-4 flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <span>{notice || listQuery.error?.message}</span>
                <Button variant="ghost" size="icon-xs" aria-label={tx('关闭提示')} onClick={() => setNotice('')}>
                  <X className="size-3" />
                </Button>
              </div>
            )}
            <MaForm
              key={form.id ?? 'new'}
              ref={formRef}
              modelValue={form}
              onModelValueChange={setForm}
              onSubmit={saveMenu}
              options={{ layout: 'grid', grid: { columns: 2, gap: '1rem' }, disabled: loading }}
              items={getFormItems(tx, form, parentMenus, views)}
            />
            {form.type === 'M' && (
              <ButtonPermissionTable
                value={form.btnPermission}
                onChange={btnPermission => setForm(current => ({ ...current, btnPermission }))}
              />
            )}
            {form.type === 'M' && (
              <div className="mt-5 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                <FileCog className="mr-2 inline size-4" aria-hidden="true" />
                {tx('选择模块或插件目录，填写不带扩展名的相对页面路径。')}
              </div>
            )}
          </section>
        </CardContent>
      </Card>

      <MaDialog {...confirm.dialogProps} cancelText={tx('取消')} />
    </>
  )
}
