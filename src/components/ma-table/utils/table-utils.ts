import type * as React from 'react'
import { getPathValue } from '@/components/reui/utils/path'
import type { MaTableColumn, MaTableModel, MaTableOptions } from '../types'

export function getColumnValue<T extends MaTableModel>(row: T, column: MaTableColumn<T>): unknown {
  if (typeof column.prop === 'function') return column.prop(row)
  if (typeof column.prop === 'string') return getPathValue(row, column.prop)
  return undefined
}

export function resolveRowKey<T extends MaTableModel>(
  row: T,
  index: number,
  rowKey: MaTableOptions<T>['rowKey'],
): string {
  const value =
    typeof rowKey === 'function'
      ? rowKey(row)
      : typeof rowKey === 'string'
        ? getPathValue(row, rowKey)
        : (row.id ?? row.key ?? index)
  return String(value)
}

export function resolveColumnLabel<T extends MaTableModel>(column: MaTableColumn<T>): React.ReactNode {
  if (typeof column.label === 'function') return column.label(column)
  return column.label
}

export function resolveRowClass<T extends MaTableModel>(
  row: T,
  index: number,
  rowClassName: MaTableOptions<T>['rowClassName'],
): string | undefined {
  return typeof rowClassName === 'function' ? rowClassName(row, index) : rowClassName
}

export function resolveRowStyle<T extends MaTableModel>(
  row: T,
  index: number,
  rowStyle: MaTableOptions<T>['rowStyle'],
): React.CSSProperties | undefined {
  return typeof rowStyle === 'function' ? rowStyle(row, index) : rowStyle
}

export function flattenColumns<T extends MaTableModel>(columns: MaTableColumn<T>[]): MaTableColumn<T>[] {
  return columns.flatMap(column => (column.children?.length ? flattenColumns(column.children) : [column]))
}
