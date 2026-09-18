import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import {
  Cascader,
  CascaderContent,
  CascaderEmpty,
  CascaderList,
  CascaderPanel,
  CascaderTrigger,
} from '@/components/reui/cascader/cascader'
import { CascaderInput, CascaderNav, CascaderValue } from '@/components/reui/cascader/cascader-nav'
import { CascaderItems } from '@/components/reui/cascader/cascader-item'
import type { CascaderNode } from '@/components/reui/cascader/cascader-types'
import type { MenuVo } from '@/modules/base/permission/menu/api/permission'
import { getMenuLabel } from '@/router/dynamic-menu'

const tx = createTextTranslator('base.permission.menu.ui')

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
  const localeRevision = useLocaleRevision()
  void localeRevision

  const items = buildCascaderNodes(menus, excludeId)

  // Add root option
  const allItems: CascaderNode[] = [{ value: '0', label: tx('顶级菜单') }, ...items]

  return (
    <Cascader
      mode="tree"
      items={allItems}
      selectable="any"
      value={value == null ? '' : String(value)}
      onValueChange={value => onChange(value ? Number(value) : 0)}
      maxHeight={240}
    >
      <CascaderTrigger
        aria-label={tx('选择父级菜单')}
        className="flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 [&>span]:line-clamp-1 [&>span]:flex [&>span]:items-center [&>span]:gap-1.5"
      >
        <CascaderValue placeholder={tx('选择父级菜单')} />
      </CascaderTrigger>
      <CascaderContent className="min-w-[min(24rem,calc(100vw-2rem))]">
        <CascaderPanel>
          <CascaderNav>
            <CascaderInput placeholder={tx('搜索菜单')} />
          </CascaderNav>
          <CascaderEmpty>{tx('未找到菜单')}</CascaderEmpty>
          <CascaderList>
            <CascaderItems />
          </CascaderList>
        </CascaderPanel>
      </CascaderContent>
    </Cascader>
  )
}
