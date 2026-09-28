import { createStore } from 'zustand/vanilla'

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

export interface DictionaryState {
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

export function createDictionaryManager() {
  const store = createStore<DictionaryState>((set, get) => ({
    dictionaries: structuredClone(initialDictionaries),
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

  const extensionDictionaries = new Map<
    string,
    { base: Dictionary[] | null; layers: Array<{ values: Dictionary[] }> }
  >()
  /** Scoped registrations restore the previous active layer even when disposed out of order. */
  function register(name: string, values: Dictionary[], replace = false) {
    if (!name.trim()) throw new Error('Dictionary name is required')
    let record = extensionDictionaries.get(name)
    if (!replace && (record?.layers.length || store.getState().find(name)))
      throw new Error(`Dictionary conflict: ${name}`)
    if (!record) {
      record = { base: store.getState().find(name), layers: [] }
      extensionDictionaries.set(name, record)
    }
    const layer = { values }
    record.layers.push(layer)
    store.getState().push(name, values, true)
    return () => {
      const index = record.layers.indexOf(layer)
      if (index < 0) return
      record.layers.splice(index, 1)
      const current = record.layers.at(-1)?.values ?? record.base
      if (current) store.getState().push(name, current, true)
      else store.getState().remove(name)
      if (!record.layers.length) extensionDictionaries.delete(name)
    }
  }

  return { store, register }
}
