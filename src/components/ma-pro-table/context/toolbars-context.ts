import { createContext } from 'react'
import { createProTableToolbars } from '../utils/toolbars'

const standalone = createProTableToolbars()
/** Standalone compatibility only. Application plugins must register on their runtime. */
export const ProTableToolbarsContext = createContext(standalone)
export const getProTableToolbars = standalone.get
export const subscribeProTableToolbars = standalone.subscribe
export const registerProTableToolbar = standalone.register
export const removeProTableToolbar = standalone.remove
