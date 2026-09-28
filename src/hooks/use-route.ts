import { useStore } from 'zustand'
import { useRuntime } from './runtime/use-runtime'
/** 当前用户的菜单和由菜单生成的路由。 */
export function useRoute() {
  const { navigation } = useRuntime()
  const menus = useStore(navigation, state => state.menus)
  const routes = useStore(navigation, state => state.routes)
  return { menus, routes }
}
