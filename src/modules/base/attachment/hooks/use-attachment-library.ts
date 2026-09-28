import { useQuery } from '@tanstack/react-query'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import { useSession } from '@/hooks/auth/use-session'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createAttachmentApi } from '@/modules/base/attachment/api/attachment'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useCallback, useState } from 'react'
import type { FilterQuery } from '@/components/reui/filters/filters-types'
import { createViewData as createAttachmentViewData } from '../views/data/attachment'
import { type AttachmentCategory, type AttachmentSort } from '../views/data/library'
import { createViewData as createLibraryViewData } from '../views/data/library'

type Request = {
  category: AttachmentCategory
  query: FilterQuery
  name: string
  sort: AttachmentSort
  page: number
  pageSize: number
}

export function useAttachmentLibrary(enabled: boolean) {
  const { attachmentError } = useRuntimeFactory(createAttachmentViewData)
  const { attachmentFilterParams, categories, emptyAttachmentQuery, sortOptions } =
    useRuntimeFactory(createLibraryViewData)

  const tx = useTextTranslator('base.data-center.attachment.ui')

  const { pageList } = useRuntimeFactory(createAttachmentApi)

  const [request, setRequest] = useState<Request>(() => ({
    category: 'all',
    query: emptyAttachmentQuery(),
    name: '',
    sort: 'newest',
    page: 1,
    pageSize: 24,
  }))
  const runtime = useRuntime()
  useSession(state => state.sessionVersion)
  const filters = attachmentFilterParams(request.query)
  const category = categories.find(item => item.value === request.category)!
  const sort = sortOptions.find(item => item.value === request.sort)!
  const query = useQuery(
    {
      ...pageList.queryOptions({
        ...filters,
        suffix: filters.suffix || category.suffixes || undefined,
        origin_name: request.name || undefined,
        page: request.page,
        page_size: request.pageSize,
        order_by: sort.order_by,
        order_by_direction: sort.order_by_direction,
      }),
      enabled,
    },
    runtime.query,
  )
  const [selection, setSelection] = useState<{ request: Request; ids: number[] } | null>(null)
  const loading = query.isFetching
  const payload = query.data?.data.data
  const validPayload = payload && Array.isArray(payload.list) && Number.isFinite(payload.total) && payload.total >= 0
  const rows = validPayload ? payload.list : []
  const total = validPayload ? payload.total : null
  const error = query.error
    ? attachmentError(query.error, tx('附件加载失败，请稍后重试'))
    : payload && !validPayload
      ? tx('附件列表响应异常，请重试')
      : null
  const selectedIds = !loading && selection?.request === request ? selection.ids : []
  const lastPage = total === null ? request.page : Math.max(1, Math.ceil(total / request.pageSize))
  // A delete can remove the last page; adjust the query parameters before committing the view.
  if (request.page > lastPage) setRequest({ ...request, page: lastPage })
  const refresh = useCallback(() => {
    setSelection(null)
    void query.refetch()
  }, [query])
  const setCategory = (category: AttachmentCategory) =>
    setRequest(current => ({
      ...current,
      category,
      page: 1,
      query: {
        ...current.query,
        rules: current.query.rules.filter(rule => rule.type === 'rule' && rule.path[0] !== 'suffix'),
      },
    }))
  const setQuery = (query: FilterQuery) => {
    const filters = attachmentFilterParams(query)
    setRequest(current => ({ ...current, query, category: filters.suffix ? 'all' : current.category, page: 1 }))
  }
  const setName = (name: string) => setRequest(current => ({ ...current, name: name.trim(), page: 1 }))
  const setSort = (sort: AttachmentSort) => setRequest(current => ({ ...current, sort, page: 1 }))
  const setPage = (page: number) => setRequest(current => ({ ...current, page }))
  const setPageSize = (pageSize: number) => setRequest(current => ({ ...current, pageSize, page: 1 }))
  const reset = () =>
    setRequest(current => ({ ...current, name: '', category: 'all', query: emptyAttachmentQuery(), page: 1 }))
  const select = (ids: number[]) => setSelection({ request, ids: ids.filter(id => rows.some(row => row.id === id)) })
  const toggleSelection = (id: number, checked: boolean) =>
    select(checked ? [...new Set([...selectedIds, id])] : selectedIds.filter(selected => selected !== id))

  const filtered = Boolean(
    request.name ||
    request.category !== 'all' ||
    Object.values(attachmentFilterParams(request.query)).some(value => value !== undefined),
  )
  return {
    ...request,
    loading,
    rows,
    total,
    error,
    selectedIds,
    selectedRows: rows.filter(row => selectedIds.includes(row.id)),
    filtered,
    refresh,
    setCategory,
    setQuery,
    setName,
    setSort,
    setPage,
    setPageSize,
    reset,
    select,
    toggleSelection,
  }
}
