import type { ReactNode } from 'react'

/**
 * Dashboard 可扩展区域。Core 只保证这些区域的生命周期和注册顺序，
 * 不对业务内容、请求或指标结构做任何假设。
 */
export type DashboardSlotName = 'main' | 'header' | 'footer'

export interface DashboardSlotRegistration {
  /** 应用内稳定且唯一的注册 ID。重复 ID 会替换旧注册。 */
  id: string
  /** 未指定时注册到 main 区域。 */
  slot?: DashboardSlotName
  /** 同一插槽内按升序渲染，默认为 0。 */
  order?: number
  /** 由应用负责渲染业务内容；Core 不接收业务 API 或数据模型。 */
  render: () => ReactNode
}

type DashboardSlotListener = () => void

const registrations = new Map<string, DashboardSlotRegistration>()
const listeners = new Set<DashboardSlotListener>()
let snapshot: readonly DashboardSlotRegistration[] = []

function publish() {
  snapshot = [...registrations.values()].sort((left, right) => {
    const orderDifference = (left.order ?? 0) - (right.order ?? 0)
    if (orderDifference) return orderDifference
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  })

  for (const listener of listeners) listener()
}

function normalizeRegistration(registration: DashboardSlotRegistration): DashboardSlotRegistration {
  const id = registration.id.trim()
  if (!id) throw new Error('Dashboard slot registration requires a non-empty id.')
  if (typeof registration.render !== 'function') {
    throw new Error(`Dashboard slot "${id}" requires a render function.`)
  }
  if (registration.slot && !['main', 'header', 'footer'].includes(registration.slot)) {
    throw new Error(`Dashboard slot "${id}" uses an unsupported slot name.`)
  }

  return {
    ...registration,
    id,
    slot: registration.slot ?? 'main',
    order: Number.isFinite(registration.order) ? registration.order : 0,
  }
}

/**
 * 注册一个 Dashboard 扩展，并返回只撤销本次注册的 disposer。
 * 业务适配器应在初始化时注册，在卸载或禁用时调用 disposer。
 */
export function registerDashboardSlot(registration: DashboardSlotRegistration): () => void {
  const normalized = normalizeRegistration(registration)
  registrations.set(normalized.id, normalized)
  publish()

  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    if (registrations.get(normalized.id) !== normalized) return
    registrations.delete(normalized.id)
    publish()
  }
}

/** 供 React 的 useSyncExternalStore 使用的稳定订阅接口。 */
export function subscribeDashboardSlots(listener: DashboardSlotListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 返回同一份快照，避免 useSyncExternalStore 在无变更时重复渲染。 */
export function getDashboardSlotsSnapshot(): readonly DashboardSlotRegistration[] {
  return snapshot
}

export function getDashboardSlots(slot: DashboardSlotName): readonly DashboardSlotRegistration[] {
  return snapshot.filter(registration => registration.slot === slot)
}
