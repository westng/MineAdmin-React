import { createContext } from 'react'
import type { MaDictOption, MaDictionarySource } from '../types'

const emptyDictionaries: Readonly<Record<string, MaDictOption[]>> = {}
export const MaDictionaryContext = createContext<MaDictionarySource>({
  subscribe: () => () => {},
  getSnapshot: () => emptyDictionaries,
  subscribeLocale: () => () => {},
  getLocaleSnapshot: () => '',
  translate: (key, fallback) => fallback ?? key,
})
