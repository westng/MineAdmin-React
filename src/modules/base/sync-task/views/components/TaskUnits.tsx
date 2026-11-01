import { AlertCircle, ChevronLeft, ChevronRight, History, RotateCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/reui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/reui/primitives/accordion'
import { Button } from '@/components/reui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/reui/primitives/empty'
import { Skeleton } from '@/components/reui/primitives/skeleton'
import type { SyncAttempt, SyncUnit } from '../../api'
import { displayError, displayTime } from '../data/display'
import { TaskStatus } from './TaskStatus'

interface TaskUnitsProps {
  units: SyncUnit[]
  total: number
  page: number
  loading: boolean
  refreshing: boolean
  error: string
  unitId: string | null
  attempts: SyncAttempt[]
  attemptLoading: boolean
  attemptError: string
  onUnitChange: (id: string | null) => void
  onPageChange: (page: number) => void
  onRefresh: () => void
}

export function TaskUnits({
  units,
  total,
  page,
  loading,
  refreshing,
  error,
  unitId,
  attempts,
  attemptLoading,
  attemptError,
  onUnitChange,
  onPageChange,
  onRefresh,
}: TaskUnitsProps) {
  const pageCount = Math.max(1, Math.ceil(total / 20))

  return (
    <section aria-label="同步执行单元" className="min-w-0 space-y-4" aria-busy={refreshing}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">执行单元</h3>
          <p className="text-xs text-muted-foreground">展开记录查看处理结果和执行历史。</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="max-sm:size-11"
          aria-label="刷新执行单元"
          title="刷新执行单元"
          disabled={refreshing || attemptLoading}
          onClick={onRefresh}
        >
          <RotateCw className={refreshing ? 'animate-spin motion-reduce:animate-none' : undefined} aria-hidden="true" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        共 <span className="font-medium tabular-nums text-foreground">{total.toLocaleString('zh-CN')}</span> 个单元
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>执行单元加载失败</AlertTitle>
          <AlertDescription className="break-words [overflow-wrap:anywhere]">{error}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <div className="space-y-3" aria-label="正在加载执行单元">
          {[0, 1, 2].map(index => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : units.length ? (
        <Accordion
          value={unitId ? [unitId] : []}
          onValueChange={value => onUnitChange(value.length ? String(value[0]) : null)}
          className="gap-3"
        >
          {units.map(unit => (
            <AccordionItem
              key={unit.id}
              value={unit.id}
              className="min-w-0 overflow-hidden rounded-lg border not-last:border-b"
            >
              <AccordionTrigger
                aria-label={`查看单元 ${unit.id} 的执行历史`}
                className="min-w-0 items-center gap-3 rounded-none px-3.5 py-3 hover:bg-muted/30 hover:no-underline"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <TaskStatus status={unit.status} />
                    <span className="text-xs text-muted-foreground">
                      {{ discover: '数据拉取', persist: '数据写入', report: '报表同步' }[unit.stage] || unit.stage}
                    </span>
                    <span className="text-xs font-normal tabular-nums text-muted-foreground sm:ml-auto">
                      执行 {unit.attempts} 次
                    </span>
                  </span>
                  <span className="break-words font-mono text-xs [overflow-wrap:anywhere]">目标：{unit.target_id}</span>
                  {unit.range_start && (
                    <span className="break-words text-xs font-normal text-muted-foreground [overflow-wrap:anywhere]">
                      {unit.range_start} 至 {unit.range_end}
                    </span>
                  )}
                  <span
                    className={`break-words text-xs font-normal leading-5 [overflow-wrap:anywhere] ${unit.error_code ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {displayError(unit.error_code)}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 border-t bg-muted/20 p-4">
                <section aria-label={`单元 ${unit.id} 的执行历史`} className="min-w-0 space-y-3">
                  <h4 className="break-words text-sm font-medium [overflow-wrap:anywhere]">
                    单元 {unit.id} 的执行历史
                  </h4>
                  {attemptLoading && <Skeleton className="h-24 w-full" aria-label="正在加载执行历史" />}
                  {attemptError && (
                    <p role="alert" className="break-words text-sm text-destructive [overflow-wrap:anywhere]">
                      {attemptError}
                    </p>
                  )}
                  {!attemptLoading && !attemptError && !attempts.length && (
                    <p className="text-sm text-muted-foreground">尚未开始执行</p>
                  )}
                  {!attemptLoading &&
                    attempts.map(attempt => (
                      <div key={attempt.id} className="min-w-0 space-y-2 rounded-lg border bg-background p-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">第 {attempt.attempt_no} 次执行</span>
                          <TaskStatus status={attempt.status} />
                        </div>
                        <p className="break-words tabular-nums text-muted-foreground [overflow-wrap:anywhere]">
                          {displayTime(attempt.started_at)} — {displayTime(attempt.finished_at)}
                        </p>
                        <p className="break-words [overflow-wrap:anywhere]">{displayError(attempt.error_code)}</p>
                        <p className="break-words font-mono text-muted-foreground [overflow-wrap:anywhere]">
                          追踪编号：{attempt.trace_id || '—'}
                        </p>
                      </div>
                    ))}
                </section>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : !error ? (
        <Empty className="rounded-lg border border-dashed py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <History aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>暂无执行单元</EmptyTitle>
            <EmptyDescription>任务开始处理后，可在这里查看结果和执行历史。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <span className="text-xs text-muted-foreground">20 个 / 页</span>
        <div className="flex items-center gap-2">
          <span className="mr-1 text-xs tabular-nums text-muted-foreground">
            {page} / {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="max-sm:size-11"
            aria-label="上一页"
            disabled={refreshing || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="max-sm:size-11"
            aria-label="下一页"
            disabled={refreshing || page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  )
}
