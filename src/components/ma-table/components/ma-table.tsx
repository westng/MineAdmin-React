import * as React from 'react'
import {
  useTable,
  type ColumnDef,
  type ColumnPinningState,
  type ExpandedState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table'
import { DataGrid, dataGridFeatures, type DataGridFeatures } from '@/components/reui/data-grid/data-grid'
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header'
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination'
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area'
import {
  DataGridTable,
  DataGridTableRowExpand,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/reui/data-grid/data-grid-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Separator } from '@/components/reui/primitives/separator'
import { FrameFooter } from '@/components/reui/frame'
import { MaTableToolbar } from './ma-table-toolbar'
import { MaTableTabs } from './ma-table-tabs'
import { useMaTableSelection } from '../hooks/use-ma-table-selection'
import { useMaTableSort } from '../hooks/use-ma-table-sort'
import { useTableCellRenderers } from '../hooks/use-table-cell-renderers'
import { renderTableCellWithOverflowPopover } from '../utils/render-cell'
import { usePropState } from '@/components/reui/utils/use-prop-state'
import {
  flattenColumns,
  getColumnValue,
  resolveColumnLabel,
  resolveRowClass,
  resolveRowKey,
  resolveRowStyle,
} from '../utils/table-utils'
import type {
  MaTableCellContext,
  MaTableColumn,
  MaTableExpose,
  MaTableModel,
  MaTableOptions,
  MaTablePagination as MaTablePaginationConfig,
  MaTableProps,
  MaTableSortOrder,
} from '../types'

type MaModel = MaTableModel
const emptyColumns: MaTableColumn[] = []
const emptyRows: MaModel[] = []
const emptyOptions: MaTableOptions = {}
const emptyPagination: MaTablePaginationConfig = {}

function filterColumns<T extends MaModel>(columns: MaTableColumn<T>[]): MaTableColumn<T>[] {
  return columns
    .filter(column => (typeof column.hide === 'function' ? !column.hide(column) : !column.hide))
    .flatMap(column => {
      if (!column.children?.length) return [column]
      const children = filterColumns(column.children)
      return children.length ? [{ ...column, children }] : []
    })
}

function getColumnId<T extends MaModel>(column: MaTableColumn<T>, path: string): string {
  return typeof column.prop === 'string' || typeof column.prop === 'number'
    ? String(column.prop)
    : (column.type ?? `column-${path}`)
}

function resolveColumnSize(width: string | number | undefined) {
  if (typeof width === 'number') return Number.isFinite(width) ? width : undefined
  if (typeof width !== 'string') return undefined

  const value = width.trim()
  if (!value || (!value.endsWith('px') && !/^\d+(?:\.\d+)?$/.test(value))) return undefined

  const size = Number.parseFloat(value)
  return Number.isFinite(size) ? size : undefined
}

function MaTableInner<T extends MaModel>(
  {
    columns: initialColumns = emptyColumns as MaTableColumn<T>[],
    data,
    options: initialOptions = emptyOptions as MaTableOptions<T>,
    className,
    tabs,
    toolbarCenter,
    toolbar,
    toolbarLeft,
    toolbarRight,
    headerContent,
    footerContent,
    loading: loadingProp,
    onSelectionChange,
    onRowClick,
    onSortChange,
    empty,
  }: MaTableProps<T>,
  ref: React.ForwardedRef<MaTableExpose<T>>,
) {
  const cellRenderers = useTableCellRenderers()
  const [columns, setColumns] = usePropState(initialColumns)
  const [options, setOptions] = usePropState(initialOptions)
  const [rows, setRows] = usePropState(data ?? options.data ?? (emptyRows as T[]))
  const [isLoading, setLoading] = usePropState(loadingProp ?? Boolean(options.loading))
  const [pagination, setPaginationState] = usePropState(options.pagination ?? emptyPagination)
  const [expandedState, setExpandedState] = React.useState<ExpandedState>({})
  const tableContainerRef = React.useRef<HTMLDivElement>(null)

  const columnTree = React.useMemo(() => filterColumns(columns), [columns])
  const visibleColumns = React.useMemo(() => flattenColumns(columnTree), [columnTree])

  const getRowKey = React.useCallback(
    (row: T, index: number) => resolveRowKey(row, index, options.rowKey),
    [options.rowKey],
  )
  const handleSortChange = React.useCallback(
    (prop: string, order: MaTableSortOrder) => {
      onSortChange?.(prop, order)
      options.on?.sortChange?.(prop, order)
    },
    [onSortChange, options.on],
  )
  const { sortState, sortedRows, setSort } = useMaTableSort({ rows, visibleColumns, onSortChange: handleSortChange })
  const pageSize = Math.max(1, pagination.pageSize ?? 10)
  const total = pagination.total ?? sortedRows.length
  const currentPage = Math.min(Math.max(1, pagination.currentPage ?? 1), Math.max(1, Math.ceil(total / pageSize)))
  const showPagination =
    options.showPagination !== false &&
    (options.showPagination === true || options.pagination !== undefined || pagination !== emptyPagination)
  const paginateLocally = showPagination && !(options.manualPagination ?? pagination.total !== undefined)
  const displayRows = React.useMemo(
    () => (paginateLocally ? sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sortedRows),
    [currentPage, pageSize, paginateLocally, sortedRows],
  )
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const getDisplayRowKey = React.useCallback(
    (row: T, index: number) => getRowKey(row, (currentPage - 1) * pageSize + index),
    [currentPage, getRowKey, pageSize],
  )
  const selectableRows = displayRows
  const { selectedKeys, selectedRows, updateSelection, clearSelection } = useMaTableSelection({
    rows: displayRows,
    selectableRows,
    getRowKey: getDisplayRowKey,
    onSelectionChange,
  })

  const setPagination = React.useCallback(
    (nextPagination: MaTablePaginationConfig) => setPaginationState(current => ({ ...current, ...nextPagination })),
    [setPaginationState],
  )
  const setCurrentPage = React.useCallback(
    (page: number) => {
      const nextPage = Math.min(Math.max(1, page), pageCount)
      setPaginationState(current => {
        return { ...current, currentPage: nextPage }
      })
      pagination.onCurrentChange?.(nextPage)
      pagination.onChange?.(nextPage, pagination.pageSize ?? 10)
    },
    [pageCount, pagination, setPaginationState],
  )
  const selectionColumn = visibleColumns.find(column => column.type === 'selection')
  const expandedColumn = visibleColumns.find(column => column.type === 'expand')
  const selectionState = React.useMemo<RowSelectionState>(
    () => Object.fromEntries([...selectedKeys].map(key => [key, true])),
    [selectedKeys],
  )
  const sortingState = React.useMemo<SortingState>(() => {
    if (!sortState.prop || !sortState.order) return []
    return [{ id: sortState.prop, desc: sortState.order === 'descending' }]
  }, [sortState])
  const expandedStateValue = React.useMemo<ExpandedState>(() => expandedState, [expandedState])
  const handleGridPaginationChange = React.useCallback(
    (updater: Updater<PaginationState>) => {
      if (pagination.disabled) return
      const current = { pageIndex: currentPage - 1, pageSize }
      const next = typeof updater === 'function' ? updater(current) : updater
      const nextPageSize = Math.max(1, next.pageSize)
      const pageSizeChanged = nextPageSize !== pageSize
      const nextPage = pageSizeChanged ? 1 : Math.min(Math.max(1, next.pageIndex + 1), pageCount)
      setPaginationState(previous => ({ ...previous, currentPage: nextPage, pageSize: nextPageSize }))
      if (nextPageSize !== pageSize) pagination.onSizeChange?.(nextPageSize)
      if (pageSizeChanged || nextPage !== currentPage) pagination.onCurrentChange?.(nextPage)
      pagination.onChange?.(nextPage, nextPageSize)
    },
    [currentPage, pageCount, pageSize, pagination, setPaginationState],
  )
  const handleGridSortingChange = React.useCallback(
    (updater: Updater<SortingState>) => {
      const next = typeof updater === 'function' ? updater(sortingState) : updater
      const nextSort = next[0]
      if (!nextSort) {
        setSort(sortingState[0]?.id ?? '', null)
        return
      }
      const column = visibleColumns.find(candidate => String(candidate.prop) === nextSort.id)
      if (column && typeof column.prop === 'string') setSort(column.prop, nextSort.desc ? 'descending' : 'ascending')
    },
    [setSort, sortingState, visibleColumns],
  )
  const handleGridRowSelectionChange = React.useCallback(
    (updater: Updater<RowSelectionState>) => {
      const next = typeof updater === 'function' ? updater(selectionState) : updater
      selectableRows.forEach((row, rowIndex) => {
        const key = getDisplayRowKey(row, rowIndex)
        const checked = next[key] === true
        if (checked !== selectedKeys.has(key)) updateSelection(row, checked, rowIndex)
      })
    },
    [getDisplayRowKey, selectableRows, selectedKeys, selectionState, updateSelection],
  )
  const handleGridExpandedChange = React.useCallback(
    (updater: Updater<ExpandedState>) => {
      const next = typeof updater === 'function' ? updater(expandedStateValue) : updater
      setExpandedState(next)
    },
    [expandedStateValue],
  )
  const configuredPinning = React.useMemo<ColumnPinningState>(() => {
    const pinning: ColumnPinningState = { start: [], end: [] }
    const visit = (items: MaTableColumn<T>[], parentPath = '', inheritedFixed?: MaTableColumn<T>['fixed']) =>
      items.forEach((column, index) => {
        const path = `${parentPath}${index}`
        const fixed = column.fixed ?? inheritedFixed
        if (column.children?.length) visit(column.children, `${path}-`, fixed)
        else if (fixed) pinning[fixed === 'right' ? 'end' : 'start']?.push(getColumnId(column, path))
      })
    visit(columnTree)
    return options.tableOptions?.initialState?.columnPinning ?? pinning
  }, [columnTree, options.tableOptions?.initialState?.columnPinning])
  const [columnPinning, setColumnPinning] = usePropState(configuredPinning)
  const gridColumns = React.useMemo<ColumnDef<DataGridFeatures, T, unknown>[]>(() => {
    const convert = (items: MaTableColumn<T>[], parentPath = ''): ColumnDef<DataGridFeatures, T, unknown>[] =>
      items.map((column, columnIndex) => {
        const path = `${parentPath}${columnIndex}`
        const columnAlign = column.align ?? options.columnAlign
        const headerAlign = column.headerAlign ?? options.headerAlign ?? options.columnAlign
        const canSort = Boolean((column.sortable ?? column.columnDef?.enableSorting) && typeof column.prop === 'string')
        const defaultSkeleton = column.skeleton ?? <div className="h-4 w-full rounded bg-muted animate-pulse" />
        return {
          id: getColumnId(column, path),
          header: ({ column: tableColumn }) => {
            const label = column.headerRender?.(column) ?? resolveColumnLabel(column)
            if (column.type === 'selection') return <DataGridTableRowSelectAll />
            if (column.headerRender || typeof label !== 'string') {
              const sortDirection = tableColumn.getIsSorted()
              const sortIcon =
                sortDirection === 'asc' ? (
                  <ArrowUp className="size-3.25" aria-hidden="true" />
                ) : sortDirection === 'desc' ? (
                  <ArrowDown className="size-3.25" aria-hidden="true" />
                ) : (
                  <ChevronsUpDown className="mt-px size-3.25" aria-hidden="true" />
                )
              return canSort ? (
                <div className="-ms-2 flex h-full items-center">
                  <button
                    type="button"
                    className={cn(
                      'text-secondary-foreground/80 hover:bg-secondary hover:text-foreground inline-flex h-6 items-center gap-1.5 rounded-lg px-2 font-normal',
                      headerAlign === 'center' && 'w-full justify-center text-center',
                      headerAlign === 'right' && 'w-full justify-end text-right',
                      column.headerClassName,
                    )}
                    onClick={() => tableColumn.toggleSorting()}
                    aria-label={`按${typeof label === 'string' ? label : '此列'}排序`}
                  >
                    {label}
                    {sortIcon}
                  </button>
                </div>
              ) : (
                <div
                  className={cn(
                    'text-secondary-foreground/80 inline-flex h-full items-center gap-1.5 font-normal text-[0.8125rem] leading-[calc(1.125/0.8125)]',
                    headerAlign === 'center' && 'justify-center text-center',
                    headerAlign === 'right' && 'justify-end text-right',
                  )}
                >
                  {label}
                </div>
              )
            }
            return (
              <DataGridColumnHeader
                column={tableColumn}
                title={label}
                visibility={options.dataGridProps?.tableLayout?.columnsVisibility}
                className={cn(
                  headerAlign === 'center' && 'w-full justify-center text-center',
                  headerAlign === 'right' && 'w-full justify-end text-right',
                  column.headerClassName,
                )}
              />
            )
          },
          accessorFn: row => getColumnValue(row, column),
          cell: ({ row }) => {
            const item = row.original
            const rowIndex = row.index
            const value = getColumnValue(item, column)
            const context: MaTableCellContext<T> = { row: item, rowIndex, column, value }
            if (column.type === 'selection') return <DataGridTableRowSelect row={row} />
            if (column.type === 'index') return (currentPage - 1) * pageSize + rowIndex + 1
            if (column.type === 'expand') return <DataGridTableRowExpand row={row} />
            return renderTableCellWithOverflowPopover(context, cellRenderers, options.showOverflowTooltip !== false)
          },
          size: resolveColumnSize(column.width),
          minSize: resolveColumnSize(column.minWidth),
          enableSorting: canSort,
          ...column.columnDef,
          meta: {
            headerTitle: typeof column.label === 'string' ? column.label : undefined,
            headerClassName: cn(
              column.headerClassName,
              headerAlign === 'center' && 'text-center',
              headerAlign === 'right' && 'text-right',
            ),
            cellClassName: cn(
              column.className,
              columnAlign === 'center' && 'text-center',
              columnAlign === 'right' && 'text-right',
            ),
            expandedContent:
              column.type === 'expand' && column.expandedRender
                ? (row: T) =>
                    column.expandedRender?.({ row, rowIndex: displayRows.indexOf(row), column, value: undefined })
                : undefined,
            skeleton: defaultSkeleton,
            ...column.columnDef?.meta,
          },
          ...(column.children?.length ? { columns: convert(column.children, `${path}-`) } : {}),
        }
      })
    return convert(columnTree)
  }, [
    cellRenderers,
    columnTree,
    currentPage,
    displayRows,
    options.columnAlign,
    options.dataGridProps?.tableLayout?.columnsVisibility,
    options.headerAlign,
    options.showOverflowTooltip,
    pageSize,
  ])
  const gridTable = useTable<DataGridFeatures, T>({
    ...options.tableOptions,
    features: dataGridFeatures,
    data: displayRows,
    columns: gridColumns,
    getRowId: (_row, index) => getDisplayRowKey(displayRows[index]!, index),
    manualPagination: true,
    pageCount,
    rowCount: total,
    state: {
      ...options.tableOptions?.state,
      columnPinning: options.tableOptions?.state?.columnPinning ?? columnPinning,
      pagination: { pageIndex: currentPage - 1, pageSize },
      sorting: sortingState,
      rowSelection: selectionState,
      expanded: expandedStateValue,
    },
    onColumnPinningChange: options.tableOptions?.onColumnPinningChange ?? setColumnPinning,
    onPaginationChange: handleGridPaginationChange,
    onSortingChange: handleGridSortingChange,
    onRowSelectionChange: handleGridRowSelectionChange,
    onExpandedChange: handleGridExpandedChange,
    manualSorting: true,
    enableRowSelection: options.tableOptions?.enableRowSelection ?? Boolean(selectionColumn),
    enableExpanding: options.tableOptions?.enableExpanding ?? Boolean(expandedColumn),
    getRowCanExpand: options.tableOptions?.getRowCanExpand ?? (() => Boolean(expandedColumn?.expandedRender)),
  })
  React.useImperativeHandle(
    ref,
    () => ({
      setData: setRows,
      setPagination,
      setCurrentPage,
      getCurrentPage: () => currentPage,
      setLoadingState: setLoading,
      setOptions: nextOptions =>
        setOptions(current => ({
          ...current,
          ...nextOptions,
          ...(nextOptions.pagination ? { pagination: { ...current.pagination, ...nextOptions.pagination } } : {}),
        })),
      getOptions: () => options,
      setColumns,
      getColumns: () => columns,
      appendColumn: column => setColumns(current => [...current, column]),
      removeColumn: prop => setColumns(current => current.filter(column => column.prop !== prop)),
      getColumnByProp: prop => flattenColumns(columns).find(column => column.prop === prop) ?? null,
      getSelectionRows: () => selectedRows,
      clearSelection,
      getElTableRef: () => tableContainerRef.current?.querySelector('table') ?? null,
      getTableInstance: () => gridTable,
    }),
    [
      clearSelection,
      columns,
      currentPage,
      gridTable,
      options,
      selectedRows,
      setColumns,
      setCurrentPage,
      setLoading,
      setOptions,
      setPagination,
      setRows,
    ],
  )
  const resolvedToolbarCenter = toolbarCenter ?? toolbar
  const hasToolbar = toolbarLeft != null || resolvedToolbarCenter != null || toolbarRight != null
  const dataGridProps = options.dataGridProps

  return (
    <DataGrid
      {...dataGridProps}
      table={gridTable}
      recordCount={total}
      isLoading={isLoading}
      loadingMode={dataGridProps?.loadingMode ?? options.loadingMode ?? 'skeleton'}
      emptyMessage={empty ?? dataGridProps?.emptyMessage ?? options.emptyText ?? '暂无数据'}
      onRowClick={
        onRowClick || dataGridProps?.onRowClick
          ? row => {
              onRowClick?.(row, displayRows.indexOf(row))
              dataGridProps?.onRowClick?.(row)
            }
          : undefined
      }
      getRowProps={(row, index) => {
        const rowProps = dataGridProps?.getRowProps?.(row, index)
        return {
          ...rowProps,
          className: cn(resolveRowClass(row, index, options.rowClassName), rowProps?.className),
          style: { ...resolveRowStyle(row, index, options.rowStyle), ...rowProps?.style },
        }
      }}
      i18n={{
        ...dataGridProps?.i18n,
        labels: {
          rowsPerPage: '每页',
          previousPage: '上一页',
          nextPage: '下一页',
          goToPage: page => `跳转到第 ${page} 页`,
          paginationInfo: ({ from, to, count }) => `第 ${from}-${to} 条，共 ${count} 条`,
          paginationEllipsis: '...',
          selectRow: '选择行',
          selectAll: '选择全部',
          expandRow: '展开行',
          collapseRow: '收起行',
          loading: '加载中…',
          empty: '暂无数据',
          ...dataGridProps?.i18n?.labels,
        },
      }}
      tableLayout={{
        dense: options.dense,
        cellBorder: options.border,
        stripped: options.stripe,
        rowBorder: true,
        footerBackground: false,
        headerSticky: false,
        columnsResizable: false,
        columnsMovable: false,
        width: options.tableLayout === 'auto' ? 'auto' : 'fixed',
        ...dataGridProps?.tableLayout,
      }}
      tableClassNames={{
        base: options.className,
        bodyRow: options.dense ? '[&>td]:h-10' : '[&>td]:h-12',
        edgeCell: 'first:ps-(--frame-panel-header-px) last:pe-(--frame-panel-header-px)',
        ...dataGridProps?.tableClassNames,
      }}
    >
      <div className={cn('w-full min-w-0', className)} style={{ height: options.containerHeight }}>
        <MaTableTabs tabs={tabs} beforeTabs={headerContent}>
          {hasToolbar && <MaTableToolbar left={toolbarLeft} center={resolvedToolbarCenter} right={toolbarRight} />}
          <div ref={tableContainerRef} className="relative min-w-0">
            {footerContent}
            <DataGridScrollArea
              {...options.scrollAreaProps}
              style={{ height: options.height, maxHeight: options.maxHeight, ...options.scrollAreaProps?.style }}
            >
              {options.renderTable ? (
                options.renderTable(gridTable)
              ) : (
                <DataGridTable renderHeader={options.showHeader !== false} {...options.gridTableProps} />
              )}
            </DataGridScrollArea>
            {showPagination && !(pagination.hideOnSinglePage && pageCount <= 1) && (
              <>
                <Separator />
                <FrameFooter>
                  <DataGridPagination sizes={pagination.pageSizes ?? [10, 20, 50, 100]} {...options.paginationProps} />
                </FrameFooter>
              </>
            )}
          </div>
        </MaTableTabs>
      </div>
    </DataGrid>
  )
}

export const MaTable = React.forwardRef(MaTableInner) as <T extends MaModel = MaModel>(
  props: MaTableProps<T> & { ref?: React.ForwardedRef<MaTableExpose<T>> },
) => React.ReactElement
