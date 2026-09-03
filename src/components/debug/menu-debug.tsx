import { useMenuStore } from '@/store/modules/useMenuStore'
import { getMenuLabel, getMenuPath } from '@/router/dynamic-menu'

export function MenuDebug() {
  const menus = useMenuStore(state => state.menus)

  return (
    <div className="fixed bottom-4 right-4 z-50 max-h-[80vh] w-96 overflow-auto rounded-lg border border-border bg-background p-4 shadow-lg">
      <h3 className="mb-2 text-sm font-semibold">菜单结构调试</h3>
      <div className="space-y-2 text-xs">
        {menus.map(menu => {
          const hasChildren = menu.children && menu.children.length > 0
          return (
            <div key={menu.id} className="rounded border border-border/50 p-2">
              <div className="font-medium">
                {getMenuLabel(menu)} ({getMenuPath(menu)})
              </div>
              {hasChildren && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-muted pl-2">
                  {menu.children!.map(child => (
                    <div key={child.id} className="text-muted-foreground">
                      → {getMenuLabel(child)} ({getMenuPath(child)})
                    </div>
                  ))}
                </div>
              )}
              {!hasChildren && (
                <div className="mt-1 text-muted-foreground">无子菜单</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
