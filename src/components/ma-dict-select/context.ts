import { createContext } from 'react'
import type { MaDictOption } from './types'

/** The application supplies data and translation without coupling the component to its runtime. */
export interface MaDictionarySource {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => Readonly<Record<string, MaDictOption[]>>
  subscribeLocale: (listener: () => void) => () => void
  getLocaleSnapshot: () => string
  translate: (key: string, fallback?: string) => string
}

const emptyDictionaries: Readonly<Record<string, MaDictOption[]>> = {}
export const MaDictionaryContext = createContext<MaDictionarySource>({
  subscribe: () => () => {},
  getSnapshot: () => emptyDictionaries,
  subscribeLocale: () => () => {},
  getLocaleSnapshot: () => '',
  translate: (key, fallback) => fallback ?? key,
})
