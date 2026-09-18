import type { ComponentType } from 'react'
import { createRegistry } from '@/services/registry'
export type LayoutId = 'classic' | 'columns' | 'mixed' | (string & {})
export interface LayoutDefinition {
  id: LayoutId
  label: string
  navigation: ComponentType
  headerNavigation?: ComponentType
  order?: number
  enabled?: boolean
}
export function createLayoutRegistry(fallback: LayoutDefinition) {
  const registry = createRegistry<LayoutDefinition>()
  registry.register(fallback)
  return {
    ...registry,
    resolve(id: string) {
      return registry.getSnapshot().find(entry => entry.id === id && entry.enabled !== false) ?? fallback
    },
  }
}
