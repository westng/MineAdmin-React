import type { MenuVo } from '@/modules/base/menu/api/menu'
import { getMenuLabel } from '@/router/navigation/menu'

export function normalizeMenuTree(menus: MenuVo[]): MenuVo[] {
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
  menus.forEach(menu => visit(menu))

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

export function filterMenuTree(menus: MenuVo[], keyword: string): MenuVo[] {
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
