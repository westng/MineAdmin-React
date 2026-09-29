import { createContext } from 'react'
import { createTableCellRenderers } from '../utils/cell-renderers'

const standalone = createTableCellRenderers()
/** Standalone compatibility only. Application plugins must register on their runtime. */
export const TableCellRenderersContext = createContext(standalone)
export const getTableCellRenderers = standalone.get
export const subscribeTableCellRenderers = standalone.subscribe
export const registerTableCellRenderer = standalone.register
export const removeTableCellRenderer = standalone.remove
