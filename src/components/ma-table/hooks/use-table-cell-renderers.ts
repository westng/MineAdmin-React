import { useSyncExternalStore } from 'react'
import { getTableCellRenderers, subscribeTableCellRenderers } from '../utils/cell-renderers'

export function useTableCellRenderers() {
  return useSyncExternalStore(subscribeTableCellRenderers, getTableCellRenderers, getTableCellRenderers)
}
