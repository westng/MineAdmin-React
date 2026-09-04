import type * as React from 'react'
import type { MaModel } from '../../shared/types'

export type MaTableModel = MaModel
export type MaTableColumnType = 'selection' | 'index' | 'expand'
export type MaTableSortOrder = 'ascending' | 'descending' | null

export interface MaTableCellContext<T extends MaTableModel = MaTableModel> {
  row: T
  rowIndex: number
  column: MaTableColumn<T>
  value: unknown
}

export interface MaTableColumn<T extends MaTableModel = MaTableModel> {
  label?: string | React.ReactNode | ((column: MaTableColumn<T>) => React.ReactNode)
  prop?: string | keyof T | ((row: T) => unknown)
  type?: MaTableColumnType
  width?: string | number
  minWidth?: string | number
  fixed?: boolean | 'left' | 'right'
  hide?: boolean | ((column: MaTableColumn<T>) => boolean)
  sortable?: boolean | 'custom'
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  className?: string
  headerClassName?: string
  formatter?: (row: T, column: MaTableColumn<T>, value: unknown, index: number) => React.ReactNode
  cellRender?: (context: MaTableCellContext<T>) => React.ReactNode
  headerRender?: (column: MaTableColumn<T>) => React.ReactNode
  children?: MaTableColumn<T>[]
  expandedRender?: (context: MaTableCellContext<T>) => React.ReactNode
}

export interface MaTablePagination {
  total?: number
  pageSize?: number
  currentPage?: number
  pageSizes?: number[]
  hideOnSinglePage?: boolean
  disabled?: boolean
  onSizeChange?: (value: number) => void
  onCurrentChange?: (value: number) => void
  onChange?: (currentPage: number, pageSize: number) => void
}

export interface MaTableOptions<T extends MaTableModel = MaTableModel> {
  data?: T[]
  containerHeight?: string
  loading?: boolean
  columnAlign?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  showOverflowTooltip?: boolean
  pagination?: MaTablePagination
  showPagination?: boolean
  adaption?: boolean
  adaptionOffsetBottom?: number
  height?: string | number
  maxHeight?: string | number
  stripe?: boolean
  border?: boolean
  showHeader?: boolean
  highlightCurrentRow?: boolean
  rowKey?: string | ((row: T) => string | number)
  rowClassName?: string | ((row: T, rowIndex: number) => string)
  rowStyle?: React.CSSProperties | ((row: T, rowIndex: number) => React.CSSProperties)
  emptyText?: string
  tableLayout?: 'fixed' | 'auto'
  className?: string
  on?: Record<string, (...args: unknown[]) => void>
}

export interface MaTableExpose<T extends MaTableModel = MaTableModel> {
  setData: (data: T[]) => void
  setPagination: (pagination: MaTablePagination) => void
  setCurrentPage: (page: number) => void
  getCurrentPage: () => number
  setLoadingState: (loading: boolean) => void
  setOptions: (options: MaTableOptions<T>) => void
  getOptions: () => MaTableOptions<T>
  setColumns: (columns: MaTableColumn<T>[]) => void
  getColumns: () => MaTableColumn<T>[]
  appendColumn: (column: MaTableColumn<T>) => void
  removeColumn: (prop: string) => void
  getColumnByProp: (prop: string) => MaTableColumn<T> | null
  getSelectionRows: () => T[]
  clearSelection: () => void
  getElTableRef: () => HTMLTableElement | null
}

export interface MaTableProps<T extends MaTableModel = MaTableModel> {
  columns?: MaTableColumn<T>[]
  data?: T[]
  options?: MaTableOptions<T>
  className?: string
  toolbar?: React.ReactNode
  toolbarLeft?: React.ReactNode
  toolbarRight?: React.ReactNode
  loading?: boolean
  onSelectionChange?: (rows: T[]) => void
  onRowClick?: (row: T, index: number) => void
  onSortChange?: (prop: string, order: MaTableSortOrder) => void
  empty?: React.ReactNode
}

export type MaTableColumns<T extends MaTableModel = MaTableModel> = MaTableColumn<T>
export type PaginationProps = MaTablePagination
export type TableColumnType = MaTableColumnType
