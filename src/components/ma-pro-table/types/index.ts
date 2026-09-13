import type * as React from 'react'
import type { MaFormOptions } from '../../ma-form/types'
import type { MaSearchItem, MaSearchExpose, MaSearchOptions } from '../../ma-search/types'
import type { MaTableCellContext, MaTableColumn, MaTableExpose, MaTableOptions, MaTablePagination, MaTableTabsConfig } from '../../ma-table/types'
import type { MaModel } from '../../shared/types'

export type MaProTableModel = MaModel

export interface MaProTableColumns<T extends MaProTableModel = MaProTableModel> extends MaTableColumn<T> {
  toolHide?: boolean
  operationConfigure?: {
    type?: 'auto' | 'dropdown' | 'tile'
    fold?: number
    actions?: MaProTableOperationAction<T>[]
  }
}

export interface MaProTableOperationAction<T extends MaProTableModel = MaProTableModel> {
  name?: string
  text?: string | ((context: MaTableCellContext<T>) => string)
  icon?: React.ReactNode
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'xs'
  className?: string
  order?: number
  disabled?: (context: MaTableCellContext<T>) => boolean
  show?: (context: MaTableCellContext<T>) => boolean
  onClick?: (context: MaTableCellContext<T>, table: MaProTableExpose<T>, event?: React.MouseEvent) => void
}

export interface MaProTableSchema<T extends MaProTableModel = MaProTableModel> {
  searchItems?: MaSearchItem<T>[]
  tableColumns?: MaProTableColumns<T>[]
}

export type MaProTableApi = (params: Record<string, unknown>) => unknown | Promise<unknown>

export interface MaProTableOptions<T extends MaProTableModel = MaProTableModel> {
  id?: string
  adaptionOffsetBottom?: number
  actionBtnPosition?: 'auto' | 'header' | 'table'
  header?: {
    show?: boolean | (() => boolean)
    mainTitle?: string | (() => string)
    subTitle?: string | (() => string)
  }
  selection?: {
    crossPage?: boolean
    rowKey?: string | ((row: T) => string | number)
    selectedText?: string | ((number: number) => string)
    clearText?: string | (() => string)
  }
  toolbar?: boolean | (() => boolean)
  /** Plugin controlled toolbar button visibility, e.g. import/export actions. */
  toolStates?: Record<string, boolean>
  requestOptions?: {
    api: MaProTableApi
    autoRequest?: boolean
    response?: { totalKey?: string; dataKey?: string }
    requestPage?: { pageName?: string; sizeName?: string; size?: number }
    requestParams?: Record<string, unknown>
    responseDataHandler?: (response: Record<string, unknown>) => T[]
  }
  onSearchSubmit?: (form: T) => Record<string, unknown> | void
  onSearchReset?: (form: T) => Record<string, unknown> | void
  tableOptions?: MaTableOptions<T>
  searchOptions?: MaSearchOptions
  searchFormOptions?: MaFormOptions
  className?: string
}

export interface MaProTableProps<T extends MaProTableModel = MaProTableModel> {
  data?: T[]
  loading?: boolean
  schema?: MaProTableSchema<T>
  options?: MaProTableOptions<T>
  variant?: 'default' | 'card'
  className?: string
  header?: React.ReactNode
  tabs?: MaTableTabsConfig | React.ReactNode
  toolbarCenter?: React.ReactNode
  toolbar?: React.ReactNode
  toolbarLeft?: React.ReactNode
  toolbarRight?: React.ReactNode
  beforeToolbar?: React.ReactNode
  afterToolbar?: React.ReactNode
  empty?: React.ReactNode
  onSelectionChange?: (rows: T[]) => void
}

export interface MaProTableExpose<T extends MaProTableModel = MaProTableModel> {
  getSearchRef: () => MaSearchExpose<T> | null
  getTableRef: () => MaTableExpose<T> | null
  getElTableStates: () => { data: T[]; loading: boolean; selectedRows: T[] }
  refresh: () => Promise<void>
  requestData: () => Promise<void>
  changeApi: (api: MaProTableApi, requestNow?: boolean) => void
  setRequestParams: (params: Record<string, unknown>, requestNow?: boolean) => void
  setTableColumns: (columns: MaProTableColumns<T>[]) => void
  getTableColumns: () => MaProTableColumns<T>[]
  setSearchForm: (form: Partial<T> | null) => void
  getSearchForm: () => T
  search: (params?: Record<string, unknown>) => void
  setProTableOptions: (options: Partial<MaProTableOptions<T>>) => void
  getProTableOptions: () => MaProTableOptions<T>
  resizeHeight: () => Promise<void>
  getCurrentId: () => string
}

export type { MaFormOptions }
export type { MaSearchExpose, MaSearchItem, MaSearchOptions }
export type { MaTableCellContext, MaTableColumn, MaTableExpose, MaTableOptions, MaTablePagination }
export type { MaTableCellRenderer, MaTableCellRenderProps, MaTableCellRenderTo } from '../../ma-table/types'
export type { MaTableTabItem, MaTableTabsConfig, MaTableTabValue } from '../../ma-table/types'
