import { useCallback, useMemo, useRef, useState } from 'react'
import { type MaProTableExpose, type MaProTableOptions } from '@/components/ma-pro-table'
import { MaDialog, useMaConfirm } from '@/components/ma-dialog'
import { MaDrawer } from '@/components/ma-drawer'
import { usePermission } from '@/hooks/auth/use-permission'
import { useQueryTable } from '@/hooks/query/use-query-table'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { useMessage } from '@/hooks/ui/use-message'
import { createApi, type SyncTask } from '../api'
import { TaskDetails } from './components/TaskDetails'
import SyncTaskTable from './components/SyncTaskTable'

import { useTextTranslator } from '@/hooks/i18n/use-translator'

export default function SyncTaskPage() {
  const tx = useTextTranslator('base.sync-task')
  const [actionId, setActionId] = useState<string | null>(null)
  const api = useRuntimeFactory(createApi)
  const { hasAuth } = usePermission()
  const canView = hasAuth('log:sync:list')
  const tableRef = useRef<MaProTableExpose<SyncTask>>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const message = useMessage()
  const queryOptions = useCallback((params: Record<string, unknown>) => api.page.queryOptions(params), [api.page])
  const query = useQueryTable<SyncTask>(queryOptions)
  const confirm = useMaConfirm({
    onError: cause => message.error(cause instanceof Error ? cause.message : tx('操作失败')),
  })
  const requestAction = useCallback(
    (row: SyncTask, action: 'retry' | 'cancel') => {
      if (confirm.dialogProps.loading || !hasAuth(`log:sync:${action}`)) return
      setActionId(row.id)
      const requestKey = crypto.randomUUID()
      confirm.open({
        title: action === 'retry' ? tx('重试失败部分') : tx('取消同步任务'),
        description:
          action === 'retry'
            ? tx('将为失败范围创建新任务，保留本次执行记录。')
            : tx('停止后续工作；正在执行的步骤可能继续完成，已写入数据不会回滚。'),
        okText: action === 'retry' ? tx('提交重试') : tx('确认取消'),
        onConfirm: async () => {
          if (!hasAuth(`log:sync:${action}`)) return false
          const response = await api.action(row.id, action, requestKey)
          message.success(
            action === 'retry'
              ? tx('重试任务已创建：{0}', { '0': response.data.data?.task_no || '' })
              : tx('取消请求已提交'),
          )
          await tableRef.current?.search()
        },
      })
    },
    [api, confirm, hasAuth, message, tx],
  )

  const options = useMemo<MaProTableOptions<SyncTask>>(
    () => ({
      id: 'log:sync:list',
      header: {
        mainTitle: tx('同步任务'),
        subTitle: tx('查看同步进度、业务结果及失败原因。任务提交成功不代表数据已写入。'),
      },
      toolbar: true,
      searchOptions: { foldButtonShow: false, cols: { xs: 1, sm: 2, md: 2, lg: 4 } },
      requestOptions: {
        api: query.request,
        requestKey: query.sessionVersion,
        requestPage: { pageName: 'page', sizeName: 'page_size', size: 20 },
        response: { dataKey: 'list', totalKey: 'total' },
      },
      tableOptions: {
        rowKey: 'id',
        className: 'min-w-[1350px]',
        pagination: { total: query.total },
        emptyText: tx('暂无同步任务；启用记录后新提交的任务会显示在此处'),
      },
    }),
    [query.request, query.sessionVersion, query.total, tx],
  )

  if (!canView)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {tx('暂无同步任务查看权限，请联系管理员。')}
      </p>
    )
  return (
    <section className="min-w-0 space-y-4" aria-label={tx('同步任务')}>
      <SyncTaskTable
        ref={tableRef}
        data={query.data}
        loading={query.loading}
        error={query.error}
        options={options}
        tx={tx}
        hasAuth={hasAuth}
        busyId={confirm.dialogProps.loading ? actionId : null}
        onDetail={setDetailId}
        onAction={requestAction}
      />
      <MaDrawer
        open={detailId !== null}
        onOpenChange={open => {
          if (!open) setDetailId(null)
        }}
        width="min(36rem, calc(100vw - 2rem))"
        contentClassName="scheme-light dark:scheme-dark"
        header={false}
        bodyClassName="flex min-h-0 flex-col overflow-hidden p-0"
        footer={false}
      >
        {detailId && <TaskDetails key={detailId} id={detailId} tasks={query.data} onTaskChange={setDetailId} />}
      </MaDrawer>
      <MaDialog {...confirm.dialogProps} cancelText={tx('返回')} />
    </section>
  )
}
