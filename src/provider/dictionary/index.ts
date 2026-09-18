import { create } from 'zustand'

export interface Dictionary {
  label: string
  value: string | number
  i18n?: string
  color?: string
  [key: string]: unknown
}

import userType from './data/base-userType'
import dataScope from './data/data-scope'
import systemState from './data/system-state'
import systemStatus from './data/system-status'

interface DictionaryState {
  dictionaries: Record<string, Dictionary[]>
  find: (name: string) => Dictionary[] | null
  push: (name: string, data: Dictionary[], replace?: boolean) => boolean
  append: (name: string, item: Dictionary) => boolean
  remove: (name: string) => void
  clear: () => void
  t: (name: string, value: string | number, attrName?: string) => string | number | null
}

const initialDictionaries: Record<string, Dictionary[]> = {
  'base-userType': userType,
  'data-scope': dataScope,
  'system-state': systemState,
  'system-status': systemStatus,
}

export const useDictStore = create<DictionaryState>((set, get) => ({
  dictionaries: initialDictionaries,
  find: name => get().dictionaries[name] || null,
  push: (name, data, replace = false) => {
    if (!replace && get().dictionaries[name]) return false
    set(state => ({ dictionaries: { ...state.dictionaries, [name]: data } }))
    return true
  },
  append: (name, item) => {
    if (!get().dictionaries[name]) return false
    set(state => ({ dictionaries: { ...state.dictionaries, [name]: [...state.dictionaries[name], item] } }))
    return true
  },
  remove: name =>
    set(state => {
      const dictionaries = { ...state.dictionaries }
      delete dictionaries[name]
      return { dictionaries }
    }),
  clear: () => set({ dictionaries: {} }),
  t: (name, value, attrName = 'label') => {
    const item = get().dictionaries[name]?.find(candidate => String(candidate.value) === String(value))
    const result = item?.[attrName]
    return typeof result === 'string' || typeof result === 'number' ? result : null
  },
}))

export default useDictStore

const extensionDictionaries = new Map<string, { base: Dictionary[] | null; layers: Array<{ values: Dictionary[] }> }>()
/** Scoped registrations restore the previous active layer even when disposed out of order. */
export function registerDictionary(name: string, values: Dictionary[], replace = false) {
  if (!name.trim()) throw new Error('Dictionary name is required')
  let record = extensionDictionaries.get(name)
  if (!replace && (record?.layers.length || useDictStore.getState().find(name)))
    throw new Error(`Dictionary conflict: ${name}`)
  if (!record) {
    record = { base: useDictStore.getState().find(name), layers: [] }
    extensionDictionaries.set(name, record)
  }
  const layer = { values }
  record.layers.push(layer)
  useDictStore.getState().push(name, values, true)
  return () => {
    const index = record.layers.indexOf(layer)
    if (index < 0) return
    record.layers.splice(index, 1)
    const current = record.layers.at(-1)?.values ?? record.base
    if (current) useDictStore.getState().push(name, current, true)
    else useDictStore.getState().remove(name)
    if (!record.layers.length) extensionDictionaries.delete(name)
  }
}
