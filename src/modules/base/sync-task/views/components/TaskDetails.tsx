import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/reui/primitives/button'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi } from '../../api'
import { displayError, displayTime, statusLabels } from '../data/display'

export function TaskDetails({ id }: { id: string }) {
  const api = useRuntimeFactory(createApi)
  const [page, setPage] = useState(1)
  const [unitId, setUnitId] = useState<string | null>(null)
  const detailQuery = useQuery({ ...api.detailOptions(id), refetchInterval: 10000 })
  const unitQuery = useQuery({ ...api.unitOptions(id, page), refetchInterval: 10000 })
  const attemptQuery = useQuery({ ...api.attemptOptions(id, unitId || ''), enabled: unitId !== null })
  const task = detailQuery.data?.data.data
  const units = unitQuery.data?.data.data.list || []
  const total = unitQuery.data?.data.data.total || 0
  const busy = detailQuery.isFetching || unitQuery.isFetching
  const error = detailQuery.error?.message || unitQuery.error?.message || ''
  const attempts = attemptQuery.data?.data.data || []
  const attemptError = attemptQuery.error?.message || ''
  const attemptBusy = unitId !== null && attemptQuery.isFetching
  const refresh = () => {
    void detailQuery.refetch()
    void unitQuery.refetch()
    if (unitId) void attemptQuery.refetch()
  }

  return (
    <div className="space-y-5" aria-busy={busy}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">刷新可查看最新执行结果</span>
        <Button variant="outline" size="sm" disabled={busy} onClick={refresh}>
          刷新
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm">
          正在加载…
        </p>
      )}
      {task && (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">任务</dt>
            <dd>{task.title}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">状态</dt>
            <dd>{statusLabels[task.status] || task.status}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">任务编号</dt>
            <dd className="break-all font-mono">{task.task_no}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">发现记录 / 确认完成</dt>
            <dd>
              {task.discovered_count} / {task.persisted_count}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">执行单元成功 / 失败 / 总数</dt>
            <dd>
              {task.units_succeeded} / {task.units_failed} / {task.units_total}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">开始时间</dt>
            <dd>{displayTime(task.started_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">完成时间</dt>
            <dd>{displayTime(task.finished_at)}</dd>
          </div>
        </dl>
      )}
      <p className="text-xs text-muted-foreground">
        确认完成包含成功写入及已确认无需更新的记录，不等同于新增条数。任务发现新数据时，执行单元总数会增长。
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">同步执行单元</caption>
          <thead className="bg-muted/50">
            <tr>
              {['目标', '阶段', '状态', '次数', '结果 / 原因', '操作'].map(label => (
                <th key={label} className="whitespace-nowrap p-3">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map(unit => (
              <tr key={unit.id} className="border-t">
                <td className="p-3">
                  {unit.target_id}
                  {unit.range_start && (
                    <div className="text-xs text-muted-foreground">
                      {unit.range_start} 至 {unit.range_end}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap p-3">
                  {{ discover: '数据拉取', persist: '数据写入', report: '报表同步' }[unit.stage] || unit.stage}
                </td>
                <td className="whitespace-nowrap p-3">{statusLabels[unit.status] || unit.status}</td>
                <td className="p-3">{unit.attempts}</td>
                <td className="min-w-40 p-3">{displayError(unit.error_code)}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => setUnitId(unit.id)}>
                    执行历史
                  </Button>
                </td>
              </tr>
            ))}
            {!busy && !units.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  暂无执行单元
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-3 text-sm">
        <span>
          共 {total} 个单元，第 {page} 页
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || page <= 1}
          onClick={() => {
            setPage(page - 1)
            setUnitId(null)
          }}
        >
          上一页
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || page * 20 >= total}
          onClick={() => {
            setPage(page + 1)
            setUnitId(null)
          }}
        >
          下一页
        </Button>
      </div>
      {unitId && (
        <section className="space-y-2" aria-label="执行历史">
          <h3 className="text-sm font-medium">单元 {unitId} 的执行历史</h3>
          {attemptBusy && <p role="status">正在加载…</p>}
          {attemptError && (
            <p role="alert" className="text-destructive">
              {attemptError}
            </p>
          )}
          {!attemptBusy && !attemptError && !attempts.length && (
            <p className="text-sm text-muted-foreground">尚未开始执行</p>
          )}
          {attempts.map(attempt => (
            <div key={attempt.id} className="space-y-1 rounded-md border p-3 text-sm">
              <p>
                第 {attempt.attempt_no} 次 · {statusLabels[attempt.status] || attempt.status}
              </p>
              <p>
                {displayTime(attempt.started_at)} — {displayTime(attempt.finished_at)}
              </p>
              <p>{displayError(attempt.error_code)}</p>
              <p className="break-all font-mono text-xs">追踪编号：{attempt.trace_id}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
