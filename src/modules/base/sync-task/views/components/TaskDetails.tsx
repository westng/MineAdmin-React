import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ChevronDown, ChevronUp, Clock3, RotateCw } from 'lucide-react'
import { MaDrawerHeader } from '@/components/ma-drawer'
import { Alert, AlertDescription, AlertTitle } from '@/components/reui/alert'
import { Badge } from '@/components/reui/primitives/badge'
import { Button } from '@/components/reui/primitives/button'
import { Skeleton } from '@/components/reui/primitives/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/reui/primitives/tabs'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi, type SyncTask } from '../../api'
import { platformLabels, triggerLabels } from '../data/display'
import { TaskMetadata, TaskOverview } from './TaskOverview'
import { TaskStatus } from './TaskStatus'
import { TaskUnits } from './TaskUnits'

interface TaskDetailsProps {
  id: string
  tasks: SyncTask[]
  onTaskChange: (id: string) => void
}

export function TaskDetails({ id, tasks, onTaskChange }: TaskDetailsProps) {
  const api = useRuntimeFactory(createApi)
  const [tab, setTab] = useState('overview')
  const [page, setPage] = useState(1)
  const [unitId, setUnitId] = useState<string | null>(null)
  const detailQuery = useQuery({ ...api.detailOptions(id), refetchInterval: 10000 })
  const unitQuery = useQuery({ ...api.unitOptions(id, page), refetchInterval: 10000 })
  const attemptQuery = useQuery({ ...api.attemptOptions(id, unitId || ''), enabled: unitId !== null })
  const task = detailQuery.data?.data.data || tasks.find(row => row.id === id)
  const index = tasks.findIndex(row => row.id === id)
  const units = unitQuery.data?.data.data.list || []
  const total = unitQuery.data?.data.data.total || 0
  const busy = detailQuery.isFetching || unitQuery.isFetching
  const attempts = attemptQuery.data?.data.data || []
  const attemptError = attemptQuery.error?.message || ''
  const attemptBusy = unitId !== null && attemptQuery.isFetching
  const refresh = () => {
    void detailQuery.refetch()
    void unitQuery.refetch()
    if (unitId) void attemptQuery.refetch()
  }

  return (
    <Tabs value={tab} onValueChange={value => setTab(String(value))} className="min-h-0 min-w-0 flex-1 flex-col gap-0">
      <MaDrawerHeader
        variant="style-1"
        title={task?.title || '同步任务详情'}
        meta={<code>{task?.task_no || `TASK-${id}`}</code>}
        titleExtra={task && <TaskStatus status={task.status} />}
        descriptionIcon={<Clock3 />}
        description={
          <>
            {task &&
              `${platformLabels[task.platform] || task.platform} · ${triggerLabels[task.trigger_type] || task.trigger_type} · `}
            每 10 秒自动刷新
          </>
        }
        actions={
          <>
            {index >= 0 && tasks.length > 1 && (
              <div className="flex items-center rounded-md border" role="group" aria-label="当前页任务导航">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="上一个任务"
                  disabled={index === 0 || busy}
                  onClick={() => onTaskChange(tasks[index - 1].id)}
                >
                  <ChevronUp aria-hidden="true" />
                </Button>
                <span
                  className="hidden px-2 text-xs tabular-nums text-muted-foreground @min-[24rem]/ma-drawer-header:block"
                  title="当前页任务"
                >
                  {index + 1} / {tasks.length}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="下一个任务"
                  disabled={index === tasks.length - 1 || busy}
                  onClick={() => onTaskChange(tasks[index + 1].id)}
                >
                  <ChevronDown aria-hidden="true" />
                </Button>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="刷新任务详情"
              title="刷新任务详情"
              disabled={busy || attemptBusy}
              onClick={refresh}
            >
              <RotateCw className={busy ? 'animate-spin motion-reduce:animate-none' : undefined} aria-hidden="true" />
            </Button>
          </>
        }
        bottom={
          <TabsList variant="line" aria-label="同步任务详情" className="h-10 gap-5 p-0">
            <TabsTrigger
              value="overview"
              className="flex-none px-0 after:inset-x-0 after:bottom-0 after:h-0.5 aria-selected:after:opacity-100"
            >
              概览
            </TabsTrigger>
            <TabsTrigger
              value="units"
              className="flex-none px-0 after:inset-x-0 after:bottom-0 after:h-0.5 aria-selected:after:opacity-100"
            >
              执行单元
              {unitQuery.data && (
                <Badge variant="outline" className="px-1.5 py-0 text-xs tabular-nums">
                  {total.toLocaleString('zh-CN')}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="flex-none px-0 after:inset-x-0 after:bottom-0 after:h-0.5 aria-selected:after:opacity-100"
            >
              任务信息
            </TabsTrigger>
          </TabsList>
        }
      />
      <TabsContent value="overview" className="min-h-0 overflow-y-auto px-[var(--ma-drawer-padding-x)] py-5">
        {detailQuery.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>任务详情加载失败</AlertTitle>
            <AlertDescription className="break-words [overflow-wrap:anywhere]">
              {detailQuery.error.message}
            </AlertDescription>
          </Alert>
        )}
        {detailQuery.isPending && !task ? (
          <Skeleton className="h-60 w-full" aria-label="正在加载任务详情" />
        ) : task ? (
          <TaskOverview task={task} onViewUnits={() => setTab('units')} />
        ) : null}
      </TabsContent>
      <TabsContent value="units" className="min-h-0 overflow-y-auto px-[var(--ma-drawer-padding-x)] py-5">
        <TaskUnits
          units={units}
          total={total}
          page={page}
          loading={unitQuery.isPending}
          refreshing={unitQuery.isFetching}
          error={unitQuery.error?.message || ''}
          unitId={unitId}
          attempts={attempts}
          attemptLoading={attemptBusy}
          attemptError={attemptError}
          onUnitChange={setUnitId}
          onPageChange={nextPage => {
            setPage(nextPage)
            setUnitId(null)
          }}
          onRefresh={refresh}
        />
      </TabsContent>
      <TabsContent value="details" className="min-h-0 overflow-y-auto px-[var(--ma-drawer-padding-x)] py-5">
        {task && (
          <section aria-label="同步任务信息" className="min-w-0 space-y-5">
            <h3 className="text-sm font-medium">任务信息</h3>
            <TaskMetadata task={task} extended />
          </section>
        )}
      </TabsContent>
    </Tabs>
  )
}
