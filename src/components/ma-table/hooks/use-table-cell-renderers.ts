import { useContext, useSyncExternalStore } from 'react'
import { TableCellRenderersContext } from '../context/cell-renderers-context'

export function useTableCellRenderers() {
  const registry = useContext(TableCellRenderersContext)
  return useSyncExternalStore(registry.subscribe, registry.get, registry.get)
}
