import * as React from 'react'
import { Table } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { MaTableBody } from './ma-table-body'
import { MaTableHeader } from './ma-table-header'
import { MaTablePagination } from './ma-table-pagination'
import { MaTableToolbar } from './ma-table-toolbar'
import { useMaTableSelection } from '../hooks/use-ma-table-selection'
import { useMaTableSort } from '../hooks/use-ma-table-sort'
import { flattenColumns, resolveRowKey } from '../utils/table-utils'
import type { MaTableColumn, MaTableExpose, MaTableModel, MaTableOptions, MaTablePagination as MaTablePaginationConfig, MaTableProps, MaTableSortOrder } from '../types'

type MaModel = MaTableModel

function MaTableInner<T extends MaModel>({ columns: initialColumns = [], data, options: initialOptions = {}, className, toolbar, toolbarLeft, toolbarRight, loading: loadingProp, onSelectionChange, onRowClick, onSortChange, empty }: MaTableProps<T>, ref: React.ForwardedRef<MaTableExpose<T>>) {
  const [columnsOverride, setColumnsOverride] = React.useState<MaTableColumn<T>[] | null>(null)
  const [internalRows, setRows] = React.useState<T[]>(initialOptions.data ?? data ?? [])
  const [optionsOverrides, setOptionsOverrides] = React.useState<MaTableOptions<T>>({})
  const options = React.useMemo(() => ({ ...initialOptions, ...optionsOverrides, pagination: { ...initialOptions.pagination, ...optionsOverrides.pagination } }), [initialOptions, optionsOverrides])
  const rows = data ?? options.data ?? internalRows
  const columns = columnsOverride ?? initialColumns
  const [loadingOverride, setLoading] = React.useState<boolean | undefined>(undefined)
  const [paginationOverrides, setPaginationOverrides] = React.useState<MaTablePaginationConfig>({})
  const pagination = React.useMemo(() => ({ ...initialOptions.pagination, ...optionsOverrides.pagination, ...paginationOverrides }), [initialOptions.pagination, optionsOverrides.pagination, paginationOverrides])
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(new Set())
  const tableContainerRef = React.useRef<HTMLDivElement>(null)

  const visibleColumns = React.useMemo(() => flattenColumns(columns).filter(column => {
    return typeof column.hide === 'function' ? !column.hide(column) : column.hide !== true
  }), [columns])

  const getRowKey = React.useCallback((row: T, index: number) => resolveRowKey(row, index, options.rowKey), [options.rowKey])
  const handleSortChange = React.useCallback((prop: string, order: MaTableSortOrder) => {
    onSortChange?.(prop, order)
    options.on?.sortChange?.(prop, order)
  }, [onSortChange, options.on])
  const { sortState, sortedRows, toggleSort } = useMaTableSort({ rows, visibleColumns, onSortChange: handleSortChange })
  const pageSize = Math.max(1, pagination.pageSize ?? 10)
  const total = pagination.total ?? sortedRows.length
  const currentPage = Math.min(Math.max(1, pagination.currentPage ?? 1), Math.max(1, Math.ceil(total / pageSize)))
  const displayRows = pagination.total === undefined ? sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sortedRows
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const getDisplayRowKey = React.useCallback((row: T, index: number) => getRowKey(row, (currentPage - 1) * pageSize + index), [currentPage, getRowKey, pageSize])
  const selectableRows = displayRows.filter(row => row !== undefined)
  const { selectedKeys, selectedRows, allSelected, partiallySelected, updateSelection, updateAllSelection, clearSelection } = useMaTableSelection({ rows: displayRows, selectableRows, getRowKey: getDisplayRowKey, onSelectionChange })

  const toggleExpanded = React.useCallback((row: T, index: number) => {
    const key = getDisplayRowKey(row, index)
    setExpandedKeys(current => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [getDisplayRowKey])

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
  const tableClassName = cn(options.border && 'border', options.stripe && '[&_tbody_tr:nth-child(even)]:bg-muted/30', options.className, className)
  const hasToolbar = toolbarLeft != null || toolbar != null || toolbarRight != null

  return (
    <div className={cn('relative flex w-full flex-col overflow-hidden rounded-lg border', className)} style={{ height: options.containerHeight }}>
      {hasToolbar && <MaTableToolbar left={toolbarLeft} center={toolbar} right={toolbarRight} />}
      <div ref={tableContainerRef} className="relative overflow-x-auto">
        <Table className={tableClassName} style={{ height: options.height, maxHeight: options.maxHeight, tableLayout: options.tableLayout ?? 'auto' }}>
          {options.showHeader !== false && <MaTableHeader columns={visibleColumns} options={options} sortState={sortState} allSelected={allSelected} partiallySelected={partiallySelected} onToggleAll={updateAllSelection} onToggleSort={toggleSort} />}
          <MaTableBody rows={displayRows} columns={visibleColumns} options={options} currentPage={currentPage} pageSize={pageSize} loading={isLoading} empty={empty} selectedKeys={selectedKeys} expandedKeys={expandedKeys} getRowKey={getDisplayRowKey} onSelectionChange={updateSelection} onExpandChange={toggleExpanded} onRowClick={onRowClick} />
        </Table>
        {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-background/50 text-sm text-muted-foreground" role="status">加载中…</div>}
      </div>
      {showPagination && !(pagination.hideOnSinglePage && pageCount <= 1) && <MaTablePagination pagination={pagination} total={total} pageSize={pageSize} currentPage={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} onPageSizeChange={nextSize => { pagination.onSizeChange?.(nextSize); pagination.onCurrentChange?.(1); pagination.onChange?.(1, nextSize); setPaginationOverrides(current => ({ ...current, pageSize: nextSize, currentPage: 1 })) }} />}
    </div>
  )
}

export const MaTable = React.forwardRef(MaTableInner) as <T extends MaModel = MaModel>(props: MaTableProps<T> & { ref?: React.ForwardedRef<MaTableExpose<T>> }) => React.ReactElement
