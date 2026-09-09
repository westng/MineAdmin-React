import * as React from 'react'
import { useTable, type ColumnDef, type ExpandedState, type PaginationState, type RowSelectionState, type SortingState, type Updater } from '@tanstack/react-table'
import { DataGrid, dataGridFeatures, type DataGridFeatures } from '@/components/reui/data-grid/data-grid'
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header'
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination'
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area'
import { DataGridTable, DataGridTableRowExpand, DataGridTableRowSelect, DataGridTableRowSelectAll } from '@/components/reui/data-grid/data-grid-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { FrameFooter } from '@/components/reui/frame'
import { MaTableToolbar } from './ma-table-toolbar'
import { useMaTableSelection } from '../hooks/use-ma-table-selection'
import { useMaTableSort } from '../hooks/use-ma-table-sort'
import { flattenColumns, getColumnValue, resolveColumnLabel, resolveRowKey } from '../utils/table-utils'
import type { MaTableCellContext, MaTableColumn, MaTableExpose, MaTableModel, MaTableOptions, MaTablePagination as MaTablePaginationConfig, MaTableProps, MaTableSortOrder } from '../types'

type MaModel = MaTableModel

function resolveColumnSize(width: string | number | undefined) {
  if (typeof width === 'number') return Number.isFinite(width) ? width : undefined
  if (typeof width !== 'string') return undefined

  const value = width.trim()
  if (!value || (!value.endsWith('px') && !/^\d+(?:\.\d+)?$/.test(value))) return undefined

  const size = Number.parseFloat(value)
  return Number.isFinite(size) ? size : undefined
}

function MaTableInner<T extends MaModel>({ columns: initialColumns = [], data, options: initialOptions = {}, className, toolbarCenter, toolbar, toolbarLeft, toolbarRight, headerContent, footerContent, loading: loadingProp, onSelectionChange, onRowClick, onSortChange, empty }: MaTableProps<T>, ref: React.ForwardedRef<MaTableExpose<T>>) {
  const [columnsOverride, setColumnsOverride] = React.useState<MaTableColumn<T>[] | null>(null)
  const [internalRows, setRows] = React.useState<T[]>(initialOptions.data ?? data ?? [])
  const [optionsOverrides, setOptionsOverrides] = React.useState<MaTableOptions<T>>({})
  const options = React.useMemo(() => ({ ...initialOptions, ...optionsOverrides, pagination: { ...initialOptions.pagination, ...optionsOverrides.pagination } }), [initialOptions, optionsOverrides])
  const rows = data ?? options.data ?? internalRows
  const columns = columnsOverride ?? initialColumns
  const [loadingOverride, setLoading] = React.useState<boolean | undefined>(undefined)
  const [paginationOverrides, setPaginationOverrides] = React.useState<MaTablePaginationConfig>({})
  const pagination = React.useMemo(() => ({ ...initialOptions.pagination, ...optionsOverrides.pagination, ...paginationOverrides }), [initialOptions.pagination, optionsOverrides.pagination, paginationOverrides])
  const [expandedState, setExpandedState] = React.useState<ExpandedState>({})
  const tableContainerRef = React.useRef<HTMLDivElement>(null)

  const visibleColumns = React.useMemo(() => flattenColumns(columns).filter(column => {
    return typeof column.hide === 'function' ? !column.hide(column) : column.hide !== true
  }), [columns])

  const getRowKey = React.useCallback((row: T, index: number) => resolveRowKey(row, index, options.rowKey), [options.rowKey])
  const handleSortChange = React.useCallback((prop: string, order: MaTableSortOrder) => {
    onSortChange?.(prop, order)
    options.on?.sortChange?.(prop, order)
  }, [onSortChange, options.on])
  const { sortState, sortedRows, setSort } = useMaTableSort({ rows, visibleColumns, onSortChange: handleSortChange })
  const pageSize = Math.max(1, pagination.pageSize ?? 10)
  const total = pagination.total ?? sortedRows.length
  const currentPage = Math.min(Math.max(1, pagination.currentPage ?? 1), Math.max(1, Math.ceil(total / pageSize)))
  const displayRows = pagination.total === undefined ? sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sortedRows
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const getDisplayRowKey = React.useCallback((row: T, index: number) => getRowKey(row, (currentPage - 1) * pageSize + index), [currentPage, getRowKey, pageSize])
  const selectableRows = displayRows.filter(row => row !== undefined)
  const { selectedKeys, selectedRows, updateSelection, clearSelection } = useMaTableSelection({ rows: displayRows, selectableRows, getRowKey: getDisplayRowKey, onSelectionChange })

  const setPagination = React.useCallback((nextPagination: MaTablePaginationConfig) => setPaginationOverrides(current => ({ ...current, ...nextPagination })), [])
  const setCurrentPage = React.useCallback((page: number) => {
    const nextPage = Math.min(Math.max(1, page), pageCount)
    setPaginationOverrides(current => {
      return { ...current, currentPage: nextPage }
    })
    pagination.onCurrentChange?.(nextPage)
    pagination.onChange?.(nextPage, pagination.pageSize ?? 10)
  }, [pageCount, pagination])

  React.useImperativeHandle(ref, () => ({
    setData: setRows,
    setPagination,
    setCurrentPage,
    getCurrentPage: () => currentPage,
    setLoadingState: setLoading,
    setOptions: nextOptions => setOptionsOverrides(current => ({ ...current, ...nextOptions })),
    getOptions: () => options,
    setColumns: setColumnsOverride,
    getColumns: () => columns,
    appendColumn: column => setColumnsOverride(current => [...(current ?? initialColumns), column]),
    removeColumn: prop => setColumnsOverride(current => (current ?? initialColumns).filter(column => column.prop !== prop)),
    getColumnByProp: prop => columns.find(column => column.prop === prop) ?? null,
    getSelectionRows: () => selectedRows,
    clearSelection,
    getElTableRef: () => tableContainerRef.current?.querySelector('table') ?? null,
  }), [clearSelection, columns, currentPage, initialColumns, options, selectedRows, setCurrentPage, setPagination])

  const showPagination = options.showPagination !== false && Boolean(options.pagination || pagination.total !== undefined)
  const isLoading = loadingProp ?? loadingOverride ?? Boolean(options.loading)
  const selectionColumn = visibleColumns.find(column => column.type === 'selection')
  const expandedColumn = visibleColumns.find(column => column.type === 'expand')
  const selectionState = React.useMemo<RowSelectionState>(() => Object.fromEntries([...selectedKeys].map(key => [key, true])), [selectedKeys])
  const sortingState = React.useMemo<SortingState>(() => {
    if (!sortState.prop || !sortState.order) return []
    return [{ id: sortState.prop, desc: sortState.order === 'descending' }]
  }, [sortState])
  const expandedStateValue = React.useMemo<ExpandedState>(() => expandedState, [expandedState])
  const handleGridPaginationChange = React.useCallback((updater: Updater<PaginationState>) => {
    if (pagination.disabled) return
    const current = { pageIndex: currentPage - 1, pageSize }
    const next = typeof updater === 'function' ? updater(current) : updater
    const nextPageSize = Math.max(1, next.pageSize)
    const pageSizeChanged = nextPageSize !== pageSize
    const nextPage = pageSizeChanged ? 1 : Math.min(Math.max(1, next.pageIndex + 1), pageCount)
    setPaginationOverrides(previous => ({ ...previous, currentPage: nextPage, pageSize: nextPageSize }))
    if (nextPageSize !== pageSize) pagination.onSizeChange?.(nextPageSize)
    if (pageSizeChanged || nextPage !== currentPage) pagination.onCurrentChange?.(nextPage)
    pagination.onChange?.(nextPage, nextPageSize)
  }, [currentPage, pageCount, pageSize, pagination])
  const handleGridSortingChange = React.useCallback((updater: Updater<SortingState>) => {
    const next = typeof updater === 'function' ? updater(sortingState) : updater
    const nextSort = next[0]
    if (!nextSort) {
      setSort(sortingState[0]?.id ?? '', null)
      return
    }
    const column = visibleColumns.find(candidate => String(candidate.prop) === nextSort.id)
    if (column && typeof column.prop === 'string') setSort(column.prop, nextSort.desc ? 'descending' : 'ascending')
  }, [setSort, sortingState, visibleColumns])
  const handleGridRowSelectionChange = React.useCallback((updater: Updater<RowSelectionState>) => {
    const next = typeof updater === 'function' ? updater(selectionState) : updater
    selectableRows.forEach((row, rowIndex) => {
      const key = getDisplayRowKey(row, rowIndex)
      const checked = next[key] === true
      if (checked !== selectedKeys.has(key)) updateSelection(row, checked, rowIndex)
    })
  }, [getDisplayRowKey, selectableRows, selectedKeys, selectionState, updateSelection])
  const handleGridExpandedChange = React.useCallback((updater: Updater<ExpandedState>) => {
    const next = typeof updater === 'function' ? updater(expandedStateValue) : updater
    setExpandedState(next)
  }, [expandedStateValue])
  const gridColumns = React.useMemo<ColumnDef<DataGridFeatures, T, unknown>[]>(() => visibleColumns.map((column, columnIndex) => {
    const columnAlign = column.align ?? options.columnAlign
    const headerAlign = column.headerAlign ?? options.headerAlign ?? options.columnAlign
    const canSort = Boolean(column.sortable && typeof column.prop === 'string')
    return {
      id: String(column.prop ?? column.type ?? `column-${columnIndex}`),
      header: ({ column: tableColumn }) => {
        const label = column.headerRender?.(column) ?? resolveColumnLabel(column)
        if (column.type === 'selection') return <DataGridTableRowSelectAll />
        if (column.headerRender || typeof label !== 'string') {
          const sortDirection = tableColumn.getIsSorted()
          const sortIcon = sortDirection === 'asc'
            ? <ArrowUp className="size-3.25" aria-hidden="true" />
            : sortDirection === 'desc'
              ? <ArrowDown className="size-3.25" aria-hidden="true" />
              : <ChevronsUpDown className="mt-px size-3.25" aria-hidden="true" />
          return canSort
            ? <div className="-ms-2 flex h-full items-center"><button type="button" className={cn('text-secondary-foreground/80 hover:bg-secondary hover:text-foreground inline-flex h-6 items-center gap-1.5 rounded-lg px-2 font-normal', headerAlign === 'center' && 'w-full justify-center text-center', headerAlign === 'right' && 'w-full justify-end text-right', column.headerClassName)} onClick={() => tableColumn.toggleSorting()} aria-label={`按${typeof label === 'string' ? label : '此列'}排序`}>{label}{sortIcon}</button></div>
            : <div className={cn('text-secondary-foreground/80 inline-flex h-full items-center gap-1.5 font-normal text-[0.8125rem] leading-[calc(1.125/0.8125)]', headerAlign === 'center' && 'justify-center text-center', headerAlign === 'right' && 'justify-end text-right')}>{label}</div>
        }
        return <DataGridColumnHeader column={tableColumn} title={label} className={cn(headerAlign === 'center' && 'w-full justify-center text-center', headerAlign === 'right' && 'w-full justify-end text-right', column.headerClassName)} />
      },
      accessorFn: row => String(getColumnValue(row, column) ?? ''),
      cell: ({ row }) => {
        const item = row.original
        const rowIndex = row.index
        const value = getColumnValue(item, column)
        const context: MaTableCellContext<T> = { row: item, rowIndex, column, value }
        if (column.type === 'selection') return <DataGridTableRowSelect row={row} />
        if (column.type === 'index') return (currentPage - 1) * pageSize + rowIndex + 1
        if (column.type === 'expand') return <DataGridTableRowExpand row={row} />
        if (column.cellRender) return column.cellRender(context)
        if (column.formatter) return column.formatter(item, column, value, rowIndex)
        return value == null || value === '' ? '-' : String(value)
      },
      meta: {
        headerTitle: typeof column.label === 'string' ? column.label : undefined,
        headerClassName: cn(column.headerClassName, headerAlign === 'center' && 'text-center', headerAlign === 'right' && 'text-right'),
        cellClassName: cn(column.className, columnAlign === 'center' && 'text-center', columnAlign === 'right' && 'text-right'),
        expandedContent: column.type === 'expand' && column.expandedRender ? (row: T) => column.expandedRender?.({ row, rowIndex: displayRows.indexOf(row), column, value: undefined }) : undefined,
      },
      size: resolveColumnSize(column.width),
      minSize: resolveColumnSize(column.minWidth),
      enableSorting: canSort,
    }
  }), [currentPage, displayRows, options.columnAlign, options.headerAlign, pageSize, visibleColumns])
  const gridTable = useTable<DataGridFeatures, T>({
    features: dataGridFeatures,
    data: displayRows,
    columns: gridColumns,
    getRowId: (_row, index) => getDisplayRowKey(displayRows[index]!, index),
    manualPagination: true,
    pageCount,
    rowCount: total,
    state: { pagination: { pageIndex: currentPage - 1, pageSize }, sorting: sortingState, rowSelection: selectionState, expanded: expandedStateValue },
    onPaginationChange: handleGridPaginationChange,
    onSortingChange: handleGridSortingChange,
    onRowSelectionChange: handleGridRowSelectionChange,
    onExpandedChange: handleGridExpandedChange,
    manualSorting: true,
    enableRowSelection: Boolean(selectionColumn),
    enableExpanding: Boolean(expandedColumn),
    getRowCanExpand: () => Boolean(expandedColumn?.expandedRender),
  })
  const resolvedToolbarCenter = toolbarCenter ?? toolbar
  const hasToolbar = toolbarLeft != null || resolvedToolbarCenter != null || toolbarRight != null

  return (
    <DataGrid table={gridTable} recordCount={total} isLoading={isLoading} emptyMessage={empty ?? options.emptyText ?? '暂无数据'} onRowClick={row => onRowClick?.(row, displayRows.indexOf(row))} i18n={{ labels: { rowsPerPage: '每页', previousPage: '上一页', nextPage: '下一页', goToPage: page => `跳转到第 ${page} 页`, paginationInfo: ({ from, to, count }) => `第 ${from}-${to} 条，共 ${count} 条`, paginationEllipsis: '...', selectRow: '选择行', selectAll: '选择全部', expandRow: '展开行', collapseRow: '收起行', loading: '加载中…', empty: '暂无数据' } }} tableLayout={{ dense: options.dense, cellBorder: options.border, stripped: options.stripe, rowBorder: true, footerBackground: false, headerSticky: false, columnsResizable: false, columnsMovable: false, width: options.tableLayout === 'auto' ? 'auto' : 'fixed' }} tableClassNames={{ base: options.className, bodyRow: options.dense ? '[&>td]:h-10' : '[&>td]:h-12', edgeCell: 'first:ps-(--frame-panel-header-px) last:pe-(--frame-panel-header-px)' }}>
      <div className={cn('w-full min-w-0', className)} style={{ height: options.containerHeight }}>
        {headerContent}
        {hasToolbar && <MaTableToolbar left={toolbarLeft} center={resolvedToolbarCenter} right={toolbarRight} />}
        <div ref={tableContainerRef} className="relative min-w-0">
          {footerContent}
          <DataGridScrollArea style={{ height: options.height, maxHeight: options.maxHeight }}>
            <DataGridTable renderHeader={options.showHeader !== false} />
          </DataGridScrollArea>
          {showPagination && !(pagination.hideOnSinglePage && pageCount <= 1) && <><Separator /><FrameFooter><DataGridPagination sizes={pagination.pageSizes ?? [10, 20, 50, 100]} /></FrameFooter></>}
        </div>
      </div>
    </DataGrid>
  )
}

export const MaTable = React.forwardRef(MaTableInner) as <T extends MaModel = MaModel>(props: MaTableProps<T> & { ref?: React.ForwardedRef<MaTableExpose<T>> }) => React.ReactElement
