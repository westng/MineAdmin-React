import { useCallback, useEffect, useState } from 'react'
import { pageList, type AttachmentVo } from '@/modules/base/user-center/api/attachment'
import type { FilterQuery } from '@/components/reui/filters/filters-types'
import { attachmentError } from '../utils/attachment'
import { attachmentFilterParams, categories, emptyAttachmentQuery, sortOptions, type AttachmentCategory, type AttachmentSort } from '../utils/library'

type Request = { category: AttachmentCategory; query: FilterQuery; name: string; sort: AttachmentSort; page: number; pageSize: number; revision: number }
type Result = { request: Request; rows: AttachmentVo[]; total: number; error: string | null }

export function useAttachmentLibrary(enabled: boolean) {
  const [request, setRequest] = useState<Request>(() => ({ category: 'all', query: emptyAttachmentQuery(), name: '', sort: 'newest', page: 1, pageSize: 24, revision: 0 }))
  const [result, setResult] = useState<Result | null>(null)
  const [selection, setSelection] = useState<{ request: Request; ids: number[] } | null>(null)
  const loading = enabled && result?.request !== request
  const rows = !loading && result?.request === request ? result.rows : []
  const total = result?.request === request ? result.total : null
  const error = result?.request === request ? result.error : null
  const selectedIds = !loading && selection?.request === request ? selection.ids : []

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const filters = attachmentFilterParams(request.query)
        const category = categories.find(item => item.value === request.category)!
        const sort = sortOptions.find(item => item.value === request.sort)!
        const response = await pageList({
          ...filters, suffix: filters.suffix || category.suffixes || undefined,
          origin_name: request.name || undefined, page: request.page, page_size: request.pageSize,
          order_by: sort.order_by, order_by_direction: sort.order_by_direction,
        }, { signal: controller.signal })
        if (controller.signal.aborted) return
        if (response.data.code !== 200) throw new Error(response.data.message || '附件加载失败')
        const data = response.data.data
        if (!data || !Array.isArray(data.list) || !Number.isFinite(data.total) || data.total < 0) throw new Error('附件列表响应异常，请重试')
        const lastPage = Math.max(1, Math.ceil(data.total / request.pageSize))
        if (request.page > lastPage) {
          setRequest(current => current === request ? { ...current, page: lastPage } : current)
          return
        }
        setResult({ request, rows: data.list, total: data.total, error: null })
      } catch (error) {
        if (!controller.signal.aborted) setResult({ request, rows: [], total: 0, error: attachmentError(error, '附件加载失败，请稍后重试') })
      }
    }
    void load()
    return () => controller.abort()
  }, [enabled, request])

  const refresh = useCallback(() => setRequest(current => ({ ...current, revision: current.revision + 1 })), [])
  const setCategory = (category: AttachmentCategory) => setRequest(current => ({ ...current, category, page: 1, query: { ...current.query, rules: current.query.rules.filter(rule => rule.type === 'rule' && rule.path[0] !== 'suffix') } }))
  const setQuery = (query: FilterQuery) => {
    const filters = attachmentFilterParams(query)
    setRequest(current => ({ ...current, query, category: filters.suffix ? 'all' : current.category, page: 1 }))
  }
  const setName = (name: string) => setRequest(current => ({ ...current, name: name.trim(), page: 1 }))
  const setSort = (sort: AttachmentSort) => setRequest(current => ({ ...current, sort, page: 1 }))
  const setPage = (page: number) => setRequest(current => ({ ...current, page }))
  const setPageSize = (pageSize: number) => setRequest(current => ({ ...current, pageSize, page: 1 }))
  const reset = () => setRequest(current => ({ ...current, name: '', category: 'all', query: emptyAttachmentQuery(), page: 1 }))
  const select = (ids: number[]) => setSelection({ request, ids: ids.filter(id => rows.some(row => row.id === id)) })
  const toggleSelection = (id: number, checked: boolean) => select(checked ? [...new Set([...selectedIds, id])] : selectedIds.filter(selected => selected !== id))

  const filtered = Boolean(request.name || request.category !== 'all' || Object.values(attachmentFilterParams(request.query)).some(value => value !== undefined))
  return { ...request, loading, rows, total, error, selectedIds, selectedRows: rows.filter(row => selectedIds.includes(row.id)), filtered, refresh, setCategory, setQuery, setName, setSort, setPage, setPageSize, reset, select, toggleSelection }
}
