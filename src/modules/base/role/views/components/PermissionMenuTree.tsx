import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { Checkbox } from '@/components/reui/primitives/checkbox'
import { Input } from '@/components/reui/primitives/input'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import type { MenuVo } from '@/modules/base/menu/api/menu'
import { getMenuLabel } from '@/router/navigation/menu'
import { filterMenuTree } from '../data/menu-tree'

export function PermissionMenuTree({
  menus,
  permissionNames,
  onChange,
  disabled = false,
}: {
  menus: MenuVo[]
  permissionNames: string[]
  onChange: (names: string[]) => void
  disabled?: boolean
}) {
  const tx = useTextTranslator('base.permission.role.ui')

  useLocaleRevision()

  const [search, setSearch] = useState('')
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() => new Set())

  function updateSearch(keyword: string) {
    setSearch(keyword)
    setCollapsedKeys(new Set())
  }

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
                  disabled={disabled || !menu.name}
                  onCheckedChange={checked => {
                    if (disabled || !menu.name) return
                    onChange(
                      checked
                        ? [...new Set([...permissionNames, menu.name])]
                        : permissionNames.filter(name => name !== menu.name),
                    )
                  }}
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

  const filteredMenus = filterMenuTree(menus, search)

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          className="pr-9"
          value={search}
          onChange={event => updateSearch(event.target.value)}
          placeholder={tx('搜索菜单名称、路径或权限编码')}
          aria-label={tx('搜索菜单权限')}
        />
        {search && (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => updateSearch('')}
            aria-label={tx('清除菜单搜索')}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="rounded-md border p-3">
        {filteredMenus.length ? (
          renderMenus(filteredMenus, 0)
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {menus.length ? tx('没有匹配的菜单权限。') : tx('暂无可配置菜单。')}
          </p>
        )}
      </div>
    </div>
  )
}
