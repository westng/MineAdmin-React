import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MaSearch } from '../../ma-search'
import { MaTable } from '../../ma-table'
import { cn } from '@/lib/utils'
import { getPathValue } from '../../shared/path'
import { readResponseList, readResponseTotal, resolveText, resolveVisible } from '../utils/pro-table-utils'
import type { MaProTableApi, MaProTableColumns, MaProTableExpose, MaProTableModel, MaProTableOptions, MaProTableProps, MaSearchExpose, MaTableExpose, MaTablePagination } from '../types'

type MaModel = MaProTableModel

function MaProTableInner<T extends MaModel>({ schema = {}, options: initialOptions = {}, variant = 'default', className, header, tabs, toolbar, toolbarLeft, toolbarRight, beforeToolbar, afterToolbar, empty, onSelectionChange }: MaProTableProps<T>, ref: React.ForwardedRef<MaProTableExpose<T>>) {
  const [options, setOptionsState] = React.useState<MaProTableOptions<T>>(initialOptions)
  const [columns, setColumnsState] = React.useState<MaProTableColumns<T>[]>(schema.tableColumns ?? [])
  const [data, setData] = React.useState<T[]>(initialOptions.tableOptions?.data ?? [])
  const [total, setTotal] = React.useState(initialOptions.tableOptions?.pagination?.total ?? 0)
  const [loading, setLoading] = React.useState(initialOptions.requestOptions?.autoRequest !== false && Boolean(initialOptions.requestOptions?.api))
  const [error, setError] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(initialOptions.tableOptions?.pagination?.currentPage ?? 1)
  const [pageSize, setPageSize] = React.useState(initialOptions.requestOptions?.requestPage?.size ?? initialOptions.tableOptions?.pagination?.pageSize ?? 10)
  const [searchForm, setSearchFormState] = React.useState<T>((initialOptions.searchOptions?.defaultValue ?? {}) as T)
  const [selectedRows, setSelectedRows] = React.useState<T[]>([])
  const searchRef = React.useRef<MaSearchExpose<T>>(null)
  const tableRef = React.useRef<MaTableExpose<T>>(null)
  const optionsRef = React.useRef(options)
  const requestParamsRef = React.useRef<Record<string, unknown>>(initialOptions.requestOptions?.requestParams ?? {})
  const searchFormRef = React.useRef(searchForm)
  const currentPageRef = React.useRef(currentPage)
  const pageSizeRef = React.useRef(pageSize)
  const autoRequestedRef = React.useRef(false)
  const requestSequenceRef = React.useRef(0)
  const columnsRef = React.useRef(columns)
  const selectedRowsRef = React.useRef(selectedRows)
  const reactId = React.useId().replace(/:/g, '')
  const tableId = options.id ?? `ma-pro-table-${reactId}`

  React.useEffect(() => {
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
  }, [])

  const requestData = React.useCallback(async () => {
    const requestOptions = optionsRef.current.requestOptions
    if (!requestOptions?.api) return
    const requestSequence = requestSequenceRef.current + 1
    requestSequenceRef.current = requestSequence
    const pageName = requestOptions.requestPage?.pageName ?? 'page'
    const sizeName = requestOptions.requestPage?.sizeName ?? 'page_size'
    const params: Record<string, unknown> = {
      ...requestOptions.requestParams,
      ...requestParamsRef.current,
      ...searchFormRef.current,
      [pageName]: currentPageRef.current,
      [sizeName]: pageSizeRef.current,
    }
    setLoading(true)
    setError('')
    try {
      const response = await Promise.resolve(requestOptions.api(params))
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
      if (requestSequence === requestSequenceRef.current) setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (autoRequestedRef.current || initialOptions.requestOptions?.autoRequest === false || !initialOptions.requestOptions?.api) return
    const timer = window.setTimeout(() => {
      if (autoRequestedRef.current) return
      autoRequestedRef.current = true
      void requestData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [initialOptions.requestOptions?.api, initialOptions.requestOptions?.autoRequest, requestData])

  const handleSearch = React.useCallback((form: T) => {
    const nextParams = optionsRef.current.onSearchSubmit?.(form)
    searchFormRef.current = { ...form, ...(nextParams ?? {}) } as T
    setSearchFormState(searchFormRef.current)
    currentPageRef.current = 1
    setCurrentPage(1)
    void requestData()
  }, [requestData])

  const handleReset = React.useCallback((form: T) => {
    const nextParams = optionsRef.current.onSearchReset?.(form)
    searchFormRef.current = { ...form, ...(nextParams ?? {}) } as T
    setSearchFormState(searchFormRef.current)
    currentPageRef.current = 1
    setCurrentPage(1)
    void requestData()
  }, [requestData])

  const handlePageChange = React.useCallback((nextPage: number, nextPageSize = pageSizeRef.current) => {
    currentPageRef.current = nextPage
    pageSizeRef.current = nextPageSize
    setCurrentPage(nextPage)
    setPageSize(nextPageSize)
    void requestData()
  }, [requestData])

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
      total,
      currentPage,
      pageSize,
      onChange: handlePageChange,
    } as MaTablePagination,
  }), [currentPage, data, handlePageChange, loading, options.tableOptions, pageSize, total])

  React.useImperativeHandle(ref, () => ({
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
      requestParamsRef.current = { ...requestParamsRef.current, ...params }
      requestSequenceRef.current += 1
      if (optionsRef.current.requestOptions) updateOptions({ requestOptions: { ...optionsRef.current.requestOptions, requestParams: requestParamsRef.current } })
      if (requestNow) void requestData()
    },
    setTableColumns: nextColumns => { columnsRef.current = nextColumns; setColumnsState(nextColumns) },
    getTableColumns: () => columnsRef.current,
    setSearchForm: form => {
      searchRef.current?.setSearchForm(form)
      searchFormRef.current = (form ?? {}) as T
      setSearchFormState(searchFormRef.current)
    },
    getSearchForm: () => searchFormRef.current,
    search: params => {
      if (params) {
        requestParamsRef.current = { ...requestParamsRef.current, ...params }
        if (optionsRef.current.requestOptions) updateOptions({ requestOptions: { ...optionsRef.current.requestOptions, requestParams: requestParamsRef.current } })
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
  }), [data, loading, requestData, selectedRows, tableId, updateOptions])

  const headerConfig = options.header
  const showHeader = resolveVisible(headerConfig?.show, Boolean(header || headerConfig?.mainTitle || headerConfig?.subTitle))
  const showToolbar = resolveVisible(options.toolbar, Boolean(toolbar || toolbarLeft || toolbarRight || beforeToolbar || afterToolbar))
  const title = resolveText(headerConfig?.mainTitle, '数据列表')
  const subtitle = resolveText(headerConfig?.subTitle, '')
  const toolbarContent = <>{beforeToolbar}{toolbarLeft}{toolbar ?? <Button type="button" variant="outline" size="sm" onClick={() => void requestData()} disabled={loading}><RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden="true" />刷新</Button>}{toolbarRight}{afterToolbar}</>
  const headerContent = header ?? <><h2 className="text-lg font-semibold">{title}</h2>{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}</>

  return (
    <section className={cn('flex w-full flex-col gap-4', className)} data-ma-pro-table-id={tableId}>
      {variant === 'card' ? <div className="overflow-hidden rounded-xl border bg-card">
        {showHeader && <header className="px-3 pt-2 pb-1"><div>{headerContent}</div></header>}
        {tabs && <div className="border-b px-3">{tabs}</div>}
        {showToolbar && <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">{toolbarContent}</div>}
        <MaSearch ref={searchRef} className="rounded-none border-0 border-b bg-transparent p-2" options={options.searchOptions} formOptions={options.searchFormOptions} searchItems={schema.searchItems} onSearch={handleSearch} onReset={handleReset} />
        {error && <div role="alert" className="border-b border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
        <MaTable ref={tableRef} className="rounded-none border-0" columns={columns} options={tableOptions} onSelectionChange={handleSelectionChange} empty={empty} />
        {selectedRows.length > 0 && options.selection && <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-sm text-muted-foreground"><span>{typeof options.selection.selectedText === 'function' ? options.selection.selectedText(selectedRows.length) : options.selection.selectedText?.replace('{number}', String(selectedRows.length)) ?? `已选择 ${selectedRows.length} 项`}</span><Button type="button" variant="ghost" size="sm" onClick={clearSelectedRows}>{resolveText(options.selection.clearText, '清除选择')}</Button></div>}
      </div> : <>
        {showHeader && <header className="flex flex-wrap items-start justify-between gap-3"><div>{headerContent}</div>{showToolbar && <div className="flex flex-wrap items-center gap-2">{toolbarContent}</div>}</header>}
        {!showHeader && showToolbar && <div className="flex flex-wrap items-center justify-end gap-2">{toolbarContent}</div>}
        <MaSearch ref={searchRef} options={options.searchOptions} formOptions={options.searchFormOptions} searchItems={schema.searchItems} onSearch={handleSearch} onReset={handleReset} />
        {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
        <MaTable ref={tableRef} columns={columns} options={tableOptions} onSelectionChange={handleSelectionChange} empty={empty} />
        {selectedRows.length > 0 && options.selection && <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"><span>{typeof options.selection.selectedText === 'function' ? options.selection.selectedText(selectedRows.length) : options.selection.selectedText?.replace('{number}', String(selectedRows.length)) ?? `已选择 ${selectedRows.length} 项`}</span><Button type="button" variant="ghost" size="sm" onClick={clearSelectedRows}>{resolveText(options.selection.clearText, '清除选择')}</Button></div>}
      </>}
    </section>
  )
}

export const MaProTable = React.forwardRef(MaProTableInner) as <T extends MaModel = MaModel>(props: MaProTableProps<T> & { ref?: React.ForwardedRef<MaProTableExpose<T>> }) => React.ReactElement
