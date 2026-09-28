import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { MaTreeSelect } from '@/components/ma-tree-select'
import type { CascaderNode } from '@/components/reui/cascader/cascader-types'
import type { MenuVo } from '@/modules/base/menu/api/permission'
import { getMenuLabel } from '@/router/navigation/menu'

interface MenuCascaderProps {
  menus: MenuVo[]
  value: number | null | undefined
  onChange: (value: number) => void
  excludeId?: number
}

function buildCascaderNodes(menus: MenuVo[], excludeId?: number): CascaderNode[] {
  return menus
    .filter(menu => menu.id !== excludeId)
    .map(menu => {
      const node: CascaderNode = {
        value: String(menu.id),
        label: getMenuLabel(menu),
      }

      if (menu.children && menu.children.length > 0) {
        node.children = buildCascaderNodes(menu.children, excludeId)
      }

      return node
    })
}

export function MenuCascader({ menus, value, onChange, excludeId }: MenuCascaderProps) {
  const tx = useTextTranslator('base.permission.menu.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

  const items = buildCascaderNodes(menus, excludeId)

  return (
    <MaTreeSelect
      items={items}
      rootOption={{ value: '0', label: tx('顶级菜单') }}
      value={value}
      excludeValues={excludeId === undefined ? [] : [excludeId]}
      onValueChange={value => onChange(value ? Number(value) : 0)}
      placeholder={tx('选择父级菜单')}
      searchPlaceholder={tx('搜索菜单')}
      emptyText={tx('未找到菜单')}
      ariaLabel={tx('选择父级菜单')}
      maxHeight={240}
    />
  )
}
