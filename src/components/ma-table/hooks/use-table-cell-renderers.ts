import { useContext, useSyncExternalStore } from 'react'
import { TableCellRenderersContext } from '../utils/cell-renderers'

export function useTableCellRenderers() {
  const registry = useContext(TableCellRenderersContext)
  return useSyncExternalStore(registry.subscribe, registry.get, registry.get)
}
