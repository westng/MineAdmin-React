import type { AppRuntime } from '@/provider/runtime/types'
import type { ResponseStruct } from '@/types/api'
import { createResourceQueries } from '@/services/query/resource'

export type SyncTask = {
  id: string
  task_no: string
  task_type: string
  title: string
  platform: string
  trigger_type: string
  created_by: string | null
  status: string
  units_total: number
  units_succeeded: number
  units_failed: number
  discovered_count: number
  persisted_count: number
  error_code: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}
export type SyncUnit = {
  id: string
  stage: string
  target_id: string
  status: string
  attempts: number
  discovered_count: number
  persisted_count: number
  error_code: string | null
  range_start?: string
  range_end?: string
}
export type SyncAttempt = {
  id: string
  attempt_no: number
  trace_id: string
  status: string
  error_code: string | null
  started_at: string
  finished_at: string | null
}
export type Page<T> = { list: T[]; total: number }

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const resource = createResourceQueries(
    'log',
    'sync-task',
    runtime.query,
    () => runtime.session.getState().sessionVersion,
  )
  const base = '/admin/sync/tasks'
  async function get<T>(url: string, signal: AbortSignal, params?: Record<string, unknown>) {
    const response = await runtime.http.get<ResponseStruct<T>>(url, { signal, params })
    if (response.data.code !== 200) throw new Error(response.data.message || '同步记录加载失败')
    return response
  }
  return {
    detailOptions: (id: string) =>
      resource.options({ kind: 'detail', id }, signal => get<SyncTask>(`${base}/${id}`, signal)),
    unitOptions: (id: string, page: number) =>
      resource.options({ kind: 'units', id, page }, signal =>
        get<Page<SyncUnit>>(`${base}/${id}/units`, signal, { page, page_size: 20 }),
      ),
    attemptOptions: (id: string, unitId: string) =>
      resource.options({ kind: 'attempts', id, unitId }, signal =>
        get<SyncAttempt[]>(`${base}/${id}/units/${unitId}/attempts`, signal),
      ),
    page: resource.list((params: Record<string, unknown>, signal) => get<Page<SyncTask>>(base, signal, params)),
    detail: (id: string, signal: AbortSignal) => get<SyncTask>(`${base}/${id}`, signal),
    units: (id: string, page: number, signal: AbortSignal) =>
      get<Page<SyncUnit>>(`${base}/${id}/units`, signal, { page, page_size: 20 }),
    attempts: (id: string, unitId: string, signal: AbortSignal) =>
      get<SyncAttempt[]>(`${base}/${id}/units/${unitId}/attempts`, signal),
    action: (id: string, action: 'retry' | 'cancel', requestKey: string) =>
      resource.mutate(async () => {
        const response = await runtime.http.post<ResponseStruct<{ task_id: string; task_no: string } | null>>(
          `${base}/${id}/${action}`,
          { request_key: requestKey },
        )
        if (response.data.code !== 200) throw new Error(response.data.message || '操作失败')
        return response
      }),
  }
}
