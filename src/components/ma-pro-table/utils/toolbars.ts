import type { MaProTableToolbar } from '../types'

let toolbars: ReadonlyMap<string, MaProTableToolbar> = new Map()
const listeners = new Set<() => void>()

function publish(next: Map<string, MaProTableToolbar>) {
  toolbars = new Map([...next].sort(([, left], [, right]) => (left.order ?? 0) - (right.order ?? 0) || left.name.localeCompare(right.name)))
  listeners.forEach(listener => listener())
}

export function getProTableToolbars() {
  return toolbars
}

export function subscribeProTableToolbars(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** 同名注册替换旧工具；清理函数只注销本次注册。 */
export function registerProTableToolbar(toolbar: MaProTableToolbar) {
  if (!toolbar.name.trim()) throw new Error('表格工具缺少名称')
  publish(new Map(toolbars).set(toolbar.name, toolbar))
  return () => {
    if (toolbars.get(toolbar.name) === toolbar) removeProTableToolbar(toolbar.name)
  }
}

export function removeProTableToolbar(name: string) {
  if (!toolbars.has(name)) return
  const next = new Map(toolbars)
  next.delete(name)
  publish(next)
}
