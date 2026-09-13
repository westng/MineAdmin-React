import * as React from 'react'
import { MoreHorizontal, RefreshCw } from 'lucide-react'
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from '@/components/reui/frame'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { MaSearch } from '../../ma-search'
import { MaTable } from '../../ma-table'
import { cn } from '@/lib/utils'
import { getPathValue } from '../../shared/path'
import { usePropState } from '../../shared/use-prop-state'
import { readResponseList, readResponseTotal, resolveText, resolveVisible } from '../utils/pro-table-utils'
import type { MaProTableApi, MaProTableColumns, MaProTableExpose, MaProTableModel, MaProTableOperationAction, MaProTableOptions, MaProTableProps, MaSearchExpose, MaTableExpose, MaTablePagination } from '../types'

type MaModel = MaProTableModel
const emptyOptions: MaProTableOptions = {}
const emptyColumns: MaProTableColumns[] = []
const emptyData: MaModel[] = []

function getOperationActionWidth<T extends MaModel>(action: MaProTableOperationAction<T>) {
  const text = typeof action.text === 'string' ? action.text : action.name ?? '操作'
  const textWidth = [...text].reduce((width, character) => width + (character.charCodeAt(0) > 255 ? 14 : 8), 0)
  return Math.max(44, textWidth + (action.icon ? 20 : 0) + 24)
}

function getOperationMinWidth<T extends MaModel>(column: MaProTableColumns<T>, actions: MaProTableOperationAction<T>[]) {
  const mode = column.operationConfigure?.type ?? 'auto'
  const fold = Math.max(0, column.operationConfigure?.fold ?? 2)
  const actionCount = mode === 'dropdown' ? 1 : Math.min(actions.length, fold) + (mode === 'auto' && actions.length > fold ? 1 : 0)
  const directActions = mode === 'dropdown' ? [] : actions.slice(0, mode === 'auto' ? fold : actions.length)
  const actionsWidth = directActions.reduce((total, action) => total + getOperationActionWidth(action), 0)
  const moreWidth = mode === 'dropdown' || (mode === 'auto' && actions.length > fold) ? 36 : 0
  return Math.max(72, actionsWidth + moreWidth + Math.max(0, actionCount - 1) * 4 + 24)
}

function MaProTableInner<T extends MaModel>({ schema = {}, options: initialOptions = emptyOptions as MaProTableOptions<T>, variant = 'default', data: controlledData, loading: controlledLoading, className, header, tabs, toolbarCenter, toolbar, toolbarLeft, toolbarRight, beforeToolbar, afterToolbar, empty, onSelectionChange }: MaProTableProps<T>, ref: React.ForwardedRef<MaProTableExpose<T>>) {
  const [options, setOptionsState] = usePropState(initialOptions)
  const [columns, setColumnsState] = usePropState(schema.tableColumns ?? emptyColumns as MaProTableColumns<T>[])
  const [requestedData, setData] = usePropState(options.tableOptions?.data ?? emptyData as T[])
  const [total, setTotal] = usePropState(options.tableOptions?.pagination?.total ?? 0)
  const [requestState, setRequestState] = React.useState({ options: initialOptions.requestOptions, loading: initialOptions.requestOptions?.autoRequest !== false && Boolean(initialOptions.requestOptions?.api) })
  const requestLoading = requestState.options === options.requestOptions && requestState.loading
  const data = controlledData ?? requestedData
  const loading = controlledLoading ?? requestLoading
  const [error, setError] = React.useState('')
  const [currentPage, setCurrentPage] = usePropState(options.tableOptions?.pagination?.currentPage ?? 1)
  const [pageSize, setPageSize] = usePropState(options.tableOptions?.pagination?.pageSize ?? options.requestOptions?.requestPage?.size ?? 10)
  const [searchForm, setSearchFormState] = React.useState<T>((initialOptions.searchOptions?.defaultValue ?? {}) as T)
  const [selectedRows, setSelectedRows] = React.useState<T[]>([])
  const searchRef = React.useRef<MaSearchExpose<T>>(null)
  const tableRef = React.useRef<MaTableExpose<T>>(null)
  const operationExposeRef = React.useRef<MaProTableExpose<T> | null>(null)
  const optionsRef = React.useRef(options)
  const searchParamsRef = React.useRef<Record<string, unknown>>((initialOptions.searchOptions?.defaultValue ?? {}) as Record<string, unknown>)
  const searchFormRef = React.useRef(searchForm)
  const currentPageRef = React.useRef(currentPage)
  const pageSizeRef = React.useRef(pageSize)
  const autoRequestedRef = React.useRef(false)
  const requestSequenceRef = React.useRef(0)
  const columnsRef = React.useRef(columns)
  const selectedRowsRef = React.useRef(selectedRows)
  const reactId = React.useId().replace(/:/g, '')
  const tableId = options.id ?? `ma-pro-table-${reactId}`

  React.useLayoutEffect(() => {
    if (optionsRef.current.requestOptions !== options.requestOptions) requestSequenceRef.current += 1
    optionsRef.current = options
    searchFormRef.current = searchForm
    currentPageRef.current = currentPage
    pageSizeRef.current = pageSize
    columnsRef.current = columns
    selectedRowsRef.current = selectedRows
  }, [columns, currentPage, options, pageSize, searchForm, selectedRows])

  const updateOptions = React.useCallback((nextOptions: Partial<MaProTableOptions<T>>) => {
    const merged: MaProTableOptions<T> = { ...optionsRef.current, ...nextOptions }
    if (nextOptions.requestOptions) merged.requestOptions = optionsRef.current.requestOptions
      ? { ...optionsRef.current.requestOptions, ...nextOptions.requestOptions }
      : nextOptions.requestOptions
    if (nextOptions.tableOptions) merged.tableOptions = { ...optionsRef.current.tableOptions, ...nextOptions.tableOptions }
    if (nextOptions.searchOptions) merged.searchOptions = { ...optionsRef.current.searchOptions, ...nextOptions.searchOptions }
    if (nextOptions.searchFormOptions) merged.searchFormOptions = { ...optionsRef.current.searchFormOptions, ...nextOptions.searchFormOptions }
    if (nextOptions.requestOptions) requestSequenceRef.current += 1
    optionsRef.current = merged
    setOptionsState(merged)
  }, [setOptionsState])

  const requestData = React.useCallback(async () => {
    const requestOptions = optionsRef.current.requestOptions
    if (!requestOptions?.api) return
    const requestSequence = requestSequenceRef.current + 1
    requestSequenceRef.current = requestSequence
    const pageName = requestOptions.requestPage?.pageName ?? 'page'
    const sizeName = requestOptions.requestPage?.sizeName ?? 'page_size'
    const params: Record<string, unknown> = {
      ...requestOptions.requestParams,
      ...searchParamsRef.current,
      [pageName]: currentPageRef.current,
      [sizeName]: pageSizeRef.current,
    }
    setRequestState({ options: requestOptions, loading: true })
    setError('')
    try {
      const response = await Promise.resolve(requestOptions.api(params))
      if (requestSequence !== requestSequenceRef.current) return
      const dataKey = requestOptions.response?.dataKey ?? 'list'
      const totalKey = requestOptions.response?.totalKey ?? 'total'
      const extracted = readResponseList<T>(response, dataKey)
      const nextData = requestOptions.responseDataHandler ? requestOptions.responseDataHandler(extracted.record) : extracted.list
      if (requestSequence !== requestSequenceRef.current) return
      setData(nextData)
      setTotal(readResponseTotal(response, totalKey, nextData.length))
    } catch (requestError) {
      if (requestSequence !== requestSequenceRef.current) return
      setError(requestError instanceof Error ? requestError.message : '表格数据加载失败')
      setData([])
      setTotal(0)
    } finally {
      if (requestSequence === requestSequenceRef.current) setRequestState({ options: requestOptions, loading: false })
    }
  }, [setData, setTotal])

  React.useEffect(() => {
    if (autoRequestedRef.current || initialOptions.requestOptions?.autoRequest === false || !initialOptions.requestOptions?.api) return
    const timer = window.setTimeout(() => {
      if (autoRequestedRef.current) return
      autoRequestedRef.current = true
      void requestData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [initialOptions.requestOptions?.api, initialOptions.requestOptions?.autoRequest, requestData])

  React.useEffect(() => () => { requestSequenceRef.current += 1 }, [])

  const handlePageChange = React.useCallback((nextPage: number, nextPageSize = pageSizeRef.current) => {
    currentPageRef.current = nextPage
    pageSizeRef.current = nextPageSize
    setCurrentPage(nextPage)
    setPageSize(nextPageSize)
    optionsRef.current.tableOptions?.pagination?.onChange?.(nextPage, nextPageSize)
    void requestData()
  }, [requestData, setCurrentPage, setPageSize])

  const submitSearch = React.useCallback(async (form: T) => {
    const nextParams = optionsRef.current.onSearchSubmit?.(form)
    searchFormRef.current = form
    searchParamsRef.current = { ...((nextParams ?? form) as unknown as Record<string, unknown>) }
    setSearchFormState(form)
    requestSequenceRef.current += 1
    currentPageRef.current = 1
    setCurrentPage(1)
    await requestData()
  }, [requestData, setCurrentPage])

  const resetSearch = React.useCallback(async (form: T) => {
    const nextParams = optionsRef.current.onSearchReset?.(form)
    searchFormRef.current = form
    searchParamsRef.current = { ...((nextParams ?? form) as unknown as Record<string, unknown>) }
    setSearchFormState(form)
    requestSequenceRef.current += 1
    currentPageRef.current = 1
    setCurrentPage(1)
    await requestData()
  }, [requestData, setCurrentPage])

  const handleSelectionChange = React.useCallback((rows: T[]) => {
    const getSelectionKey = (row: T) => {
      const rowKey = optionsRef.current.selection?.rowKey ?? optionsRef.current.tableOptions?.rowKey
      const value = typeof rowKey === 'function' ? rowKey(row) : typeof rowKey === 'string' ? getPathValue(row, rowKey) : row.id ?? row.key
      return value == null ? JSON.stringify(row) : String(value)
    }
    const nextRows = optionsRef.current.selection?.crossPage
      ? [...selectedRowsRef.current.filter(existing => !data.some(row => getSelectionKey(row) === getSelectionKey(existing))), ...rows]
      : rows
    selectedRowsRef.current = nextRows
    setSelectedRows(nextRows)
    onSelectionChange?.(nextRows)
  }, [data, onSelectionChange])

  const clearSelectedRows = React.useCallback(() => {
    selectedRowsRef.current = []
    setSelectedRows([])
    tableRef.current?.clearSelection()
  }, [])

  const tableOptions = React.useMemo(() => ({
    ...options.tableOptions,
    data,
    loading,
    pagination: {
      ...options.tableOptions?.pagination,
      total: controlledData === undefined && options.requestOptions?.api ? total : options.tableOptions?.pagination?.total ?? data.length,
      currentPage,
      pageSize,
      onChange: handlePageChange,
    } as MaTablePagination,
  }), [controlledData, currentPage, data, handlePageChange, loading, options.requestOptions?.api, options.tableOptions, pageSize, total])

  React.useImperativeHandle(ref, () => {
    const expose: MaProTableExpose<T> = {
    getSearchRef: () => searchRef.current,
    getTableRef: () => tableRef.current,
    getElTableStates: () => ({ data, loading, selectedRows }),
    refresh: requestData,
    requestData,
    changeApi: (api: MaProTableApi, requestNow = true) => {
      requestSequenceRef.current += 1
      updateOptions({ requestOptions: { ...optionsRef.current.requestOptions, api } })
      if (requestNow) void requestData()
    },
    setRequestParams: (params, requestNow = true) => {
      requestSequenceRef.current += 1
      if (optionsRef.current.requestOptions) updateOptions({ requestOptions: { ...optionsRef.current.requestOptions, requestParams: { ...optionsRef.current.requestOptions.requestParams, ...params } } })
      if (requestNow) void requestData()
    },
    setTableColumns: nextColumns => { columnsRef.current = nextColumns; setColumnsState(nextColumns) },
    getTableColumns: () => columnsRef.current,
    setSearchForm: form => {
      searchRef.current?.setSearchForm(form)
      searchFormRef.current = (form ?? {}) as T
      searchParamsRef.current = (form ?? {}) as Record<string, unknown>
      setSearchFormState(searchFormRef.current)
    },
    getSearchForm: () => searchFormRef.current,
    search: params => {
      if (params) {
        if (optionsRef.current.requestOptions) updateOptions({ requestOptions: { ...optionsRef.current.requestOptions, requestParams: { ...optionsRef.current.requestOptions.requestParams, ...params } } })
      }
      requestSequenceRef.current += 1
      currentPageRef.current = 1
      setCurrentPage(1)
      void requestData()
    },
    setProTableOptions: updateOptions,
    getProTableOptions: () => optionsRef.current,
    resizeHeight: async () => { await Promise.resolve() },
    getCurrentId: () => tableId,
    }
    operationExposeRef.current = expose
    return expose
  }, [data, loading, requestData, selectedRows, setColumnsState, setCurrentPage, tableId, updateOptions])

  const operationColumns = React.useMemo(() => columns.map(column => {
    const actions = column.operationConfigure?.actions
    if (!actions?.length) return column
    const sortedActions = [...actions].sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    const operationMinWidth = getOperationMinWidth(column, actions)
    return {
      ...column,
      minWidth: operationMinWidth,
      width: operationMinWidth,
      align: 'center' as const,
      headerAlign: 'center' as const,
      className: cn(column.className, 'whitespace-nowrap'),
      cellRender: (context: Parameters<NonNullable<MaProTableColumns<T>['cellRender']>>[0]) => {
        const visibleActions = sortedActions.filter(action => action.show?.(context) ?? true)
        const renderText = (action: MaProTableOperationAction<T>) => typeof action.text === 'function' ? action.text(context) : action.text ?? action.name ?? '操作'
        const renderButton = (action: MaProTableOperationAction<T>, index: number) => <Button key={action.name ?? `${String(action.text ?? 'operation')}-${index}`} type="button" variant={action.variant ?? 'ghost'} size={action.size ?? 'sm'} className={cn('whitespace-nowrap', action.className)} disabled={action.disabled?.(context) ?? false} onClick={event => action.onClick?.(context, operationExposeRef.current as MaProTableExpose<T>, event)}>{action.icon}{renderText(action)}</Button>
        const renderMenu = (actionsToRender: MaProTableOperationAction<T>[]) => <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="更多操作"><MoreHorizontal aria-hidden="true" /></Button>} /><DropdownMenuContent align="end">{actionsToRender.map((action, index) => <React.Fragment key={action.name ?? `${String(action.text ?? 'operation')}-${index}`}>{action.variant === 'destructive' && index > 0 && <DropdownMenuSeparator />}<DropdownMenuItem className="whitespace-nowrap" variant={action.variant === 'destructive' ? 'destructive' : 'default'} disabled={action.disabled?.(context) ?? false} onClick={event => action.onClick?.(context, operationExposeRef.current as MaProTableExpose<T>, event)}>{action.icon}{renderText(action)}</DropdownMenuItem></React.Fragment>)}</DropdownMenuContent></DropdownMenu>
        const mode = column.operationConfigure?.type ?? 'auto'
        const fold = Math.max(0, column.operationConfigure?.fold ?? 2)
        if (mode === 'dropdown' || (mode === 'auto' && visibleActions.length > fold)) {
          const primary = mode === 'auto' ? visibleActions.slice(0, fold) : []
          const overflow = mode === 'auto' ? visibleActions.slice(fold) : visibleActions
          return <div className="flex flex-wrap justify-end gap-1">{primary.map(renderButton)}{overflow.length > 0 && renderMenu(overflow)}</div>
        }
        return <div className="flex flex-wrap justify-end gap-1">{visibleActions.map(renderButton)}</div>
      },
    }
  }), [columns])

  const headerConfig = options.header
  const showHeader = resolveVisible(headerConfig?.show, Boolean(header || headerConfig?.mainTitle || headerConfig?.subTitle))
  const showToolbar = resolveVisible(options.toolbar, Boolean(toolbarCenter || toolbar || toolbarLeft || toolbarRight || beforeToolbar || afterToolbar))
  const title = resolveText(headerConfig?.mainTitle, '数据列表')
  const subtitle = resolveText(headerConfig?.subTitle, '')
  const tableToolbarLeft = <>{beforeToolbar}{toolbarLeft}</>
  const hasToolbarCenter = toolbarCenter != null || toolbar != null
  const tableToolbarCenter = toolbarCenter ?? toolbar
  const tableToolbarRight = <>{toolbarRight}{!hasToolbarCenter && toolbarRight == null && <Button type="button" variant="outline" size="sm" onClick={() => void requestData()} disabled={loading}><RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden="true" />刷新</Button>}{afterToolbar}</>
  const headerContent = header ?? <><FrameTitle>{title}</FrameTitle>{subtitle && <FrameDescription>{subtitle}</FrameDescription>}</>
  const searchItems = schema.searchItems ?? []
  const showSearch = searchItems.length > 0 && resolveVisible(options.searchOptions?.show, true)
  const tableToolbarProps = showToolbar
    ? { toolbarLeft: tableToolbarLeft, toolbarCenter: tableToolbarCenter, toolbarRight: tableToolbarRight }
    : {}
  const selectionContent = selectedRows.length > 0 && options.selection
    ? <div className="bg-muted/25 flex flex-col gap-3 border-b px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
      <div className="flex min-w-0 flex-col gap-0.5"><span className="text-sm font-medium">{typeof options.selection.selectedText === 'function' ? options.selection.selectedText(selectedRows.length) : options.selection.selectedText?.replace('{number}', String(selectedRows.length)) ?? `已选择 ${selectedRows.length} 项`}</span></div>
      <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="ghost" size="sm" onClick={clearSelectedRows}>{resolveText(options.selection.clearText, '清除选择')}</Button></div>
    </div>
    : undefined

  return (
    <Frame
      dense
      variant="default"
      spacing="sm"
      className={cn('w-full min-w-0', options.className, className)}
      data-ma-pro-table-id={tableId}
      data-variant={variant}
    >
      {showHeader && <FrameHeader className="min-w-0 flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">{headerContent}</div>
      </FrameHeader>}
      <FramePanel className="min-w-0 bg-card p-0! shadow-none!">
        <MaTable
          ref={tableRef}
          columns={operationColumns}
          options={tableOptions}
          tabs={tabs}
          onSelectionChange={handleSelectionChange}
          empty={empty}
          headerContent={error || showSearch ? <>
            {error && <div role="alert" className="border-b border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
            {showSearch && <><MaSearch ref={searchRef} searchItems={searchItems} options={options.searchOptions} formOptions={options.searchFormOptions} className="rounded-none border-0 bg-transparent p-3 shadow-none" onSearch={submitSearch} onReset={resetSearch} /><Separator /></>}
          </> : undefined}
          footerContent={selectionContent}
          {...tableToolbarProps}
        />
      </FramePanel>
    </Frame>
  )
}

export const MaProTable = React.forwardRef(MaProTableInner) as <T extends MaModel = MaModel>(props: MaProTableProps<T> & { ref?: React.ForwardedRef<MaProTableExpose<T>> }) => React.ReactElement
