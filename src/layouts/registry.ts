import type { ComponentType } from 'react'
import { createRegistry } from '@/services/registry'
export type LayoutId = 'classic' | 'columns' | 'mixed' | (string & {})
export interface LayoutDefinition {
  id: LayoutId
  aliases?: string[]
  label: string
  navigation: ComponentType
  headerNavigation?: ComponentType
  shell?: 'default' | 'inset'
  order?: number
  enabled?: boolean
}
export function createLayoutRegistry(fallback: LayoutDefinition) {
  const registry = createRegistry<LayoutDefinition>()
  registry.register(fallback)
  return {
    ...registry,
    resolve(id: string) {
      const layouts = registry.getSnapshot().filter(entry => entry.enabled !== false)
      return layouts.find(entry => entry.id === id) ?? layouts.find(entry => entry.aliases?.includes(id)) ?? fallback
    },
  }
}
