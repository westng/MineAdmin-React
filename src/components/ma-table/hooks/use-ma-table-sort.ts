import * as React from 'react'
import { getColumnValue } from '../utils/table-utils'
import type { MaTableColumn, MaTableModel, MaTableSortOrder } from '../types'

export interface UseMaTableSortOptions<T extends MaTableModel> {
  rows: T[]
  visibleColumns: MaTableColumn<T>[]
  onSortChange?: (prop: string, order: MaTableSortOrder) => void
}

export interface UseMaTableSortResult<T extends MaTableModel> {
  sortState: { prop: string; order: MaTableSortOrder }
  sortedRows: T[]
  toggleSort: (column: MaTableColumn<T>) => void
}

export function useMaTableSort<T extends MaTableModel>({ rows, visibleColumns, onSortChange }: UseMaTableSortOptions<T>): UseMaTableSortResult<T> {
  const [sortState, setSortState] = React.useState<{ prop: string; order: MaTableSortOrder }>({ prop: '', order: null })
  const sortedRows = React.useMemo(() => {
    if (!sortState.prop || !sortState.order) return rows
    const column = visibleColumns.find(candidate => candidate.prop === sortState.prop)
    if (!column) return rows
    return [...rows].sort((left, right) => {
      const leftValue = getColumnValue(left, column)
      const rightValue = getColumnValue(right, column)
      if (leftValue === rightValue) return 0
      if (leftValue === undefined || leftValue === null) return sortState.order === 'ascending' ? -1 : 1
      if (rightValue === undefined || rightValue === null) return sortState.order === 'ascending' ? 1 : -1
      const result = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true })
      return sortState.order === 'ascending' ? result : -result
    })
  }, [rows, sortState, visibleColumns])

  const toggleSort = React.useCallback((column: MaTableColumn<T>) => {
    if (!column.sortable || typeof column.prop !== 'string') return
    setSortState(current => {
      const order = current.prop !== column.prop ? 'ascending' : current.order === 'ascending' ? 'descending' : current.order === 'descending' ? null : 'ascending'
      onSortChange?.(column.prop as string, order)
      return { prop: column.prop as string, order }
    })
  }, [onSortChange])

  return { sortState, sortedRows, toggleSort }
}
