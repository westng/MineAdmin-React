import type { ComponentType } from 'react'
import { lazyView } from './lazy-view'
export interface ComponentManifestEntry {
  id: string
  load: () => Promise<{ default?: ComponentType }>
  aliases?: readonly string[]
}
const normalize = (value: string) =>
  value
    .replace(/^@\//, '')
    .replace(/^\//, '')
    .replace(/^modules\//, '')
    .replace(/\.(tsx|jsx)$/, '')
export function createComponentManifest() {
  const entries = new Map<string, { entry: ComponentManifestEntry; component?: ComponentType }>()
  return {
    register(values: readonly ComponentManifestEntry[]) {
      const added: string[] = []
      for (const entry of values) {
        for (const key of [entry.id, ...(entry.aliases ?? [])]) {
          if (
            !key ||
            key.includes('..') ||
            /[\\?#]/.test(key) ||
            entries.has(normalize(key)) ||
            added.includes(normalize(key))
          )
            throw new Error(`Invalid or duplicate component ID: ${key}`)
          added.push(normalize(key))
        }
      }
      for (const entry of values) {
        const record = { entry }
        for (const key of [entry.id, ...(entry.aliases ?? [])]) entries.set(normalize(key), record)
      }
      let disposed = false
      return () => {
        if (!disposed) {
          disposed = true
          for (const key of added) entries.delete(key)
        }
      }
    },
    resolve(id?: string): ComponentType | null {
      if (!id || id.includes('..') || /[\\?#]/.test(id)) return null
      const record = entries.get(normalize(id))
      if (!record) return null
      record.component ??= lazyView(record.entry.load, '页面')
      return record.component
    },
    has: (id: string) => entries.has(normalize(id)),
  }
}
export type ComponentManifest = ReturnType<typeof createComponentManifest>
export const componentManifest = createComponentManifest()
