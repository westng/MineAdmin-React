import { useCallback, useEffect, useMemo } from 'react'
import { Badge } from '@/components/reui/primitives/badge'
import { CircleDot } from 'lucide-react'
import { hotkeysCoreFeature, syncDataLoaderFeature, type ItemInstance } from '@headless-tree/core'
import { useTree } from '@headless-tree/react'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { MaIcon } from '@/components/ma-icon'
import { Tree, TreeItem, TreeItemLabel } from '@/components/reui/tree'
import { getMenuLabel, getMenuType } from '@/router/navigation/menu'
import type { MenuVo } from '../../api/menu'

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

export function MenuTree({
  menus,
  selectedId,
  onSelect,
}: {
  menus: MenuVo[]
  selectedId?: number
  onSelect: (menu: MenuVo) => void
}) {
  const tx = useTextTranslator('base.permission.menu.ui')
  const createMenuTreeData = useCallback(
    (menus: MenuVo[]) => {
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
    },
    [tx],
  )

  const localeRevision = useLocaleRevision()
  void localeRevision

  const treeData = useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return createMenuTreeData(menus)
  }, [menus, localeRevision, createMenuTreeData])
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
