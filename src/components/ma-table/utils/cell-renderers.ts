import type { MaTableCellRenderer } from '../types'

export function createTableCellRenderers() {
  let renderers: ReadonlyMap<string, MaTableCellRenderer> = new Map()
  const listeners = new Set<() => void>()

  function publish(next: Map<string, MaTableCellRenderer>) {
    renderers = next
    listeners.forEach(listener => listener())
  }

  function getTableCellRenderers() {
    return renderers
  }

  function subscribeTableCellRenderers(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  /** 同名注册会替换旧实现；返回值只注销本次注册，便于按需启停。 */
  function registerTableCellRenderer(renderer: MaTableCellRenderer) {
    if (!renderer.name.trim()) throw new Error('单元格渲染器缺少名称')
    publish(new Map(renderers).set(renderer.name, renderer))
    return () => {
      if (renderers.get(renderer.name) === renderer) removeTableCellRenderer(renderer.name)
    }
  }

  function removeTableCellRenderer(name: string) {
    if (!renderers.has(name)) return
    const next = new Map(renderers)
    next.delete(name)
    publish(next)
  }

  return {
    get: getTableCellRenderers,
    subscribe: subscribeTableCellRenderers,
    register: registerTableCellRenderer,
    remove: removeTableCellRenderer,
  }
}
