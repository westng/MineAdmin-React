import type * as React from 'react'
import type { ColumnDef, TableOptions, TableState } from '@tanstack/react-table'
import type { DataGridFeatures, DataGridProps, DataGridTableInstance } from '@/components/reui/data-grid/data-grid'
import type { DataGridTable } from '@/components/reui/data-grid/data-grid-table'
import type { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination'
import type { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area'
import type { MaModel } from '../../shared/types'

export type MaTableModel = MaModel
export type MaTableColumnType = 'selection' | 'index' | 'expand' | 'operation'
export type MaTableSortOrder = 'ascending' | 'descending' | null

type MaTableManagedState = 'pagination' | 'sorting' | 'rowSelection' | 'expanded'

/** Ma 层管理数据、分页、排序和选择，其余 TanStack 配置可直接扩展。 */
export type MaTableInstanceOptions<T extends MaTableModel> = Omit<
  Partial<TableOptions<DataGridFeatures, T>>,
  'features' | 'columns' | 'data' | 'getRowId' | 'state' | 'initialState' |
  'manualPagination' | 'manualSorting' | 'pageCount' | 'rowCount' |
  'onPaginationChange' | 'onSortingChange' | 'onRowSelectionChange' | 'onExpandedChange'
> & {
  state?: Partial<Omit<TableState<DataGridFeatures>, MaTableManagedState>>
  initialState?: Partial<Omit<TableState<DataGridFeatures>, MaTableManagedState>>
}

export type MaTableDataGridProps<T extends MaTableModel> = Omit<DataGridProps<DataGridFeatures, T>, 'table' | 'children' | 'recordCount' | 'isLoading'>

export type MaTableTabValue = string | number

export interface MaTableTabItem {
  value: MaTableTabValue
  label: React.ReactNode
  count?: number | string
  disabled?: boolean
}

export interface MaTableTabsConfig {
  items: readonly MaTableTabItem[]
  value?: MaTableTabValue
  defaultValue?: MaTableTabValue
  ariaLabel?: string
  onValueChange?: (value: MaTableTabValue, item: MaTableTabItem) => void
}

export interface MaTableCellContext<T extends MaTableModel = MaTableModel> {
  row: T
  rowIndex: number
  column: MaTableColumn<T>
  value: unknown
}

export type MaTableCellRenderProps = Record<string, unknown> | readonly unknown[]

export interface MaTableCellRenderTo<T extends MaTableModel = MaTableModel, P = MaTableCellRenderProps> {
  name: string
  props?: P | ((context: MaTableCellContext<T>) => P)
}

export interface MaTableCellRenderer {
  name: string
  render: <T extends MaTableModel>(context: MaTableCellContext<T>, props: unknown) => React.ReactNode
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
  cellRenderTo?: MaTableCellRenderTo<T>
  headerRender?: (column: MaTableColumn<T>) => React.ReactNode
  children?: MaTableColumn<T>[]
  expandedRender?: (context: MaTableCellContext<T>) => React.ReactNode
  skeleton?: React.ReactNode
  /** TanStack 列配置；id 和嵌套结构仍由 Ma 列定义管理。 */
  columnDef?: Partial<Omit<ColumnDef<DataGridFeatures, T, unknown>, 'id' | 'columns'>>
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
  loadingMode?: 'skeleton' | 'spinner'
  columnAlign?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  showOverflowTooltip?: boolean
  pagination?: MaTablePagination
  showPagination?: boolean
  /** 默认根据 total 推断远端分页；false 对完整数据在本地分页。隐藏分页器时不切分本地数据。 */
  manualPagination?: boolean
  dataGridProps?: MaTableDataGridProps<T>
  tableOptions?: MaTableInstanceOptions<T>
  gridTableProps?: React.ComponentProps<typeof DataGridTable>
  scrollAreaProps?: Omit<React.ComponentProps<typeof DataGridScrollArea>, 'children'>
  paginationProps?: React.ComponentProps<typeof DataGridPagination>
  /** 在 DataGrid 上下文中自定义表体，可接入官方 Dnd / Virtual 变体。 */
  renderTable?: (table: DataGridTableInstance<T>) => React.ReactNode
  adaption?: boolean
  adaptionOffsetBottom?: number
  height?: string | number
  maxHeight?: string | number
  stripe?: boolean
  border?: boolean
  dense?: boolean
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
  getTableInstance: () => DataGridTableInstance<T>
}

export interface MaTableProps<T extends MaTableModel = MaTableModel> {
  columns?: MaTableColumn<T>[]
  data?: T[]
  options?: MaTableOptions<T>
  className?: string
  tabs?: MaTableTabsConfig | React.ReactNode
  toolbarCenter?: React.ReactNode
  toolbar?: React.ReactNode
  toolbarLeft?: React.ReactNode
  toolbarRight?: React.ReactNode
  headerContent?: React.ReactNode
  footerContent?: React.ReactNode
  loading?: boolean
  onSelectionChange?: (rows: T[]) => void
  onRowClick?: (row: T, index: number) => void
  onSortChange?: (prop: string, order: MaTableSortOrder) => void
  empty?: React.ReactNode
}

export type MaTableColumns<T extends MaTableModel = MaTableModel> = MaTableColumn<T>
export type PaginationProps = MaTablePagination
export type TableColumnType = MaTableColumnType
