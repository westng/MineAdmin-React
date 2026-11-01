import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/reui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/reui/primitives/accordion'
import { Button } from '@/components/reui/primitives/button'
import type { SyncTask } from '../../api'
import { displayError, displayTime, platformLabels, statusLabels, triggerLabels } from '../data/display'

export function TaskMetadata({ task, extended = false }: { task: SyncTask; extended?: boolean }) {
  const items = [
    ...(extended
      ? [
          ['任务 ID', task.id],
          ['任务编号', task.task_no],
          ['任务名称', task.title],
        ]
      : []),
    ['平台', platformLabels[task.platform] || task.platform],
    ['触发方式', triggerLabels[task.trigger_type] || task.trigger_type],
    ['任务状态', statusLabels[task.status] || task.status],
    ['提交时间', displayTime(task.created_at)],
    ['开始时间', displayTime(task.started_at)],
    ['完成时间', displayTime(task.finished_at)],
  ]

  return (
    <dl className="space-y-3 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd
            className={`min-w-0 break-words [overflow-wrap:anywhere] ${label === '任务编号' || label === '任务 ID' ? 'font-mono' : 'tabular-nums'}`}
          >
            {value || '—'}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function TaskOverview({ task, onViewUnits }: { task: SyncTask; onViewUnits: () => void }) {
  const failed = ['failed', 'timed_out'].includes(task.status)
  const partial = task.status === 'partial_success'
  const succeeded = task.status === 'succeeded'
  const StatusIcon = failed || partial ? AlertCircle : succeeded ? CheckCircle2 : Clock3
  const metrics = [
    ['发现记录', task.discovered_count],
    ['确认完成', task.persisted_count],
    ['执行单元总数', task.units_total],
    ['单元成功 / 失败', `${task.units_succeeded} / ${task.units_failed}`],
  ]

  return (
    <div className="min-w-0 space-y-5">
      <Alert variant={failed ? 'destructive' : partial ? 'warning' : succeeded ? 'success' : 'default'} role="status">
        <StatusIcon aria-hidden="true" />
        <AlertTitle>同步{statusLabels[task.status] || task.status}</AlertTitle>
        <AlertDescription className="min-w-0 text-xs [overflow-wrap:anywhere]">
          {task.error_code
            ? displayError(task.error_code)
            : succeeded && Number(task.discovered_count) === 0
              ? '同步成功，范围内无数据。'
              : '查看执行单元，了解各步骤的处理结果与执行历史。'}
        </AlertDescription>
        <AlertAction>
          <Button type="button" variant="outline" size="xs" className="max-sm:min-h-11" onClick={onViewUnits}>
            查看记录
          </Button>
        </AlertAction>
      </Alert>
      <Accordion multiple defaultValue={['progress', 'details']}>
        <AccordionItem value="progress" className="pb-2">
          <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline">同步进度</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-1 pb-3">
            <dl className="grid grid-cols-2 gap-4">
              {metrics.map(([label, value]) => (
                <div key={label} className="min-w-0 space-y-1.5">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="break-words text-lg font-medium tabular-nums [overflow-wrap:anywhere]">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-5 text-muted-foreground">
              确认完成包含成功写入及已确认无需更新的记录，不等同于新增条数。任务发现新数据时，执行单元总数会增长。
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="details" className="pt-2">
          <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline">任务详情</AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <TaskMetadata task={task} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
