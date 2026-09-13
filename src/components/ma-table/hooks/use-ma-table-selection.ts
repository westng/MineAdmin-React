import * as React from 'react'
import type { MaTableModel } from '../types'

export interface UseMaTableSelectionOptions<T extends MaTableModel> {
  rows: T[]
  selectableRows: T[]
  getRowKey: (row: T, index: number) => string
  onSelectionChange?: (rows: T[]) => void
}

export interface UseMaTableSelectionResult<T extends MaTableModel> {
  selectedKeys: Set<string>
  selectedRows: T[]
  allSelected: boolean
  partiallySelected: boolean
  updateSelection: (row: T, checked: boolean, index: number) => void
  updateAllSelection: (checked: boolean) => void
  clearSelection: () => void
}

export function useMaTableSelection<T extends MaTableModel>({ rows, selectableRows, getRowKey, onSelectionChange }: UseMaTableSelectionOptions<T>): UseMaTableSelectionResult<T> {
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set())
  const selectedRows = React.useMemo(() => rows.filter((row, index) => selectedKeys.has(getRowKey(row, index))), [getRowKey, rows, selectedKeys])
  const allSelected = selectableRows.length > 0 && selectableRows.every((row, index) => selectedKeys.has(getRowKey(row, index)))
  const partiallySelected = !allSelected && selectableRows.some((row, index) => selectedKeys.has(getRowKey(row, index)))

  const onSelectionChangeRef = React.useRef(onSelectionChange)
  const notifiedSelectionRef = React.useRef<T[] | null>(null)
  React.useLayoutEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  }, [onSelectionChange])
  React.useEffect(() => {
    const previous = notifiedSelectionRef.current
    if (previous && previous.length === selectedRows.length && previous.every((row, index) => row === selectedRows[index])) return
    notifiedSelectionRef.current = selectedRows
    onSelectionChangeRef.current?.(selectedRows)
  }, [selectedRows])

  const updateSelection = React.useCallback((row: T, checked: boolean, index: number) => {
    const key = getRowKey(row, index)
    setSelectedKeys(current => {
      const next = new Set(current)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }, [getRowKey])

  const updateAllSelection = React.useCallback((checked: boolean) => {
    setSelectedKeys(current => {
      const next = new Set(current)
      selectableRows.forEach((row, index) => {
        const key = getRowKey(row, index)
        if (checked) next.add(key)
        else next.delete(key)
      })
      return next
    })
  }, [getRowKey, selectableRows])

  const clearSelection = React.useCallback(() => setSelectedKeys(new Set()), [])

  return { selectedKeys, selectedRows, allSelected, partiallySelected, updateSelection, updateAllSelection, clearSelection }
}
