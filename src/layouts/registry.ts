import type { ComponentType } from 'react'
import { createRegistry } from '@/services/registry'
export type LayoutId = 'classic' | 'columns' | 'mixed' | (string & {})
export interface LayoutDefinition {
  id: LayoutId
  labelKey?: string
  label: string
  navigation: ComponentType
  headerNavigation?: ComponentType
  shell?: 'default' | 'inset'
  order?: number
  enabled?: boolean
}
export function createLayoutRegistry(fallback?: LayoutDefinition) {
  const registry = createRegistry<LayoutDefinition>()
  if (fallback) registry.register(fallback)
  return {
    ...registry,
    resolve(id: string) {
      const layouts = registry.getSnapshot().filter(entry => entry.enabled !== false)
      const resolved = layouts.find(entry => entry.id === id) ?? layouts[0]
      if (!resolved) throw new Error('No enabled layout registered')
      return resolved
    },
  }
}
