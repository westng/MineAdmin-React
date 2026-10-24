import { useCallback, useMemo, useRef, useState } from 'react'
import {
  MaProTable,
  type MaProTableColumns,
  type MaProTableExpose,
  type MaProTableOptions,
} from '@/components/ma-pro-table'
import { MaDialog, useMaConfirm } from '@/components/ma-dialog'
import { MaDrawer } from '@/components/ma-drawer'
import { usePermission } from '@/hooks/auth/use-permission'
import { useQueryTable } from '@/hooks/query/use-query-table'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { useMessage } from '@/hooks/ui/use-message'
import { createApi, type SyncTask } from '../api'
import { TaskDetails } from './components/TaskDetails'
import { displayError, displayTime, isActive, statusLabels, triggerLabels } from './data/display'

export default function SyncTaskPage() {
  const api = useRuntimeFactory(createApi)
  const { hasAuth } = usePermission()
  const canView = hasAuth('log:sync:list')
  const tableRef = useRef<MaProTableExpose<SyncTask>>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const message = useMessage()
  const queryOptions = useCallback((params: Record<string, unknown>) => api.page.queryOptions(params), [api.page])
  const query = useQueryTable<SyncTask>(queryOptions)
  const confirm = useMaConfirm({ onError: cause => message.error(cause instanceof Error ? cause.message : '操作失败') })
  const requestAction = useCallback(
    (row: SyncTask, action: 'retry' | 'cancel') => {
      const requestKey = crypto.randomUUID()
      confirm.open({
        title: action === 'retry' ? '重试失败部分' : '取消同步任务',
        description:
          action === 'retry'
            ? '将为失败范围创建新任务，保留本次执行记录。'
            : '停止后续工作；正在执行的步骤可能继续完成，已写入数据不会回滚。',
        okText: action === 'retry' ? '提交重试' : '确认取消',
        onConfirm: async () => {
          if (!hasAuth(`log:sync:${action}`)) return false
          const response = await api.action(row.id, action, requestKey)
          message.success(
            action === 'retry' ? `重试任务已创建：${response.data.data?.task_no || ''}` : '取消请求已提交',
          )
          await tableRef.current?.search()
        },
      })
    },
    [api, confirm, hasAuth, message],
  )
  const columns = useMemo<MaProTableColumns<SyncTask>[]>(
    () => [
      { prop: 'task_no', label: '任务编号', width: 240 },
      { prop: 'title', label: '同步任务', width: 150 },
      {
        prop: 'platform',
        label: '平台',
        width: 110,
        cellRender: ({ row }) =>
          ({ pdd: '拼多多', doudian: '抖店', wangdian: '旺店通', oceanengine: '巨量引擎' })[row.platform] ||
          row.platform,
      },
      {
        prop: 'trigger_type',
        label: '触发方式',
        width: 110,
        cellRender: ({ row }) => triggerLabels[row.trigger_type] || row.trigger_type,
      },
      {
        prop: 'status',
        label: '状态',
        width: 110,
        cellRender: ({ row }) => (
          <span className={['failed', 'partial_success'].includes(row.status) ? 'text-destructive' : undefined}>
            {statusLabels[row.status] || row.status}
          </span>
        ),
      },
      {
        prop: 'persisted_count',
        label: '确认完成 / 发现',
        width: 140,
        cellRender: ({ row }) => `${row.persisted_count} / ${row.discovered_count}`,
      },
      { prop: 'created_at', label: '提交时间', width: 185, cellRender: ({ row }) => displayTime(row.created_at) },
      {
        prop: 'error_code',
        label: '结果说明',
        width: 240,
        cellRender: ({ row }) =>
          row.status === 'succeeded' && Number(row.discovered_count) === 0
            ? '同步成功，范围内无数据'
            : displayError(row.error_code),
      },
      {
        type: 'operation',
        label: '操作',
        width: 210,
        operationConfigure: {
          type: 'auto',
          actions: [
            { name: 'detail', text: '详情', onClick: ({ row }) => setDetailId(row.id) },
            ...(hasAuth('log:sync:retry')
              ? [
                  {
                    name: 'retry',
                    text: '重试',
                    disabled: ({ row }: { row: SyncTask }) => !['failed', 'partial_success'].includes(row.status),
                    onClick: ({ row }: { row: SyncTask }) => requestAction(row, 'retry'),
                  },
                ]
              : []),
            ...(hasAuth('log:sync:cancel')
              ? [
                  {
                    name: 'cancel',
                    text: '取消',
                    disabled: ({ row }: { row: SyncTask }) => !isActive(row.status) || row.status === 'cancelling',
                    onClick: ({ row }: { row: SyncTask }) => requestAction(row, 'cancel'),
                  },
                ]
              : []),
          ],
        },
      },
    ],
    [hasAuth, requestAction],
  )
  const options = useMemo<MaProTableOptions<SyncTask>>(
    () => ({
      id: 'log:sync:list',
      header: { mainTitle: '同步任务', subTitle: '查看同步进度、业务结果及失败原因。任务提交成功不代表数据已写入。' },
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
        emptyText: '暂无同步任务；启用记录后新提交的任务会显示在此处',
      },
    }),
    [query.request, query.sessionVersion, query.total],
  )

  if (!canView)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        暂无同步任务查看权限，请联系管理员。
      </p>
    )
  return (
    <section className="min-w-0 space-y-4" aria-label="同步任务">
      <MaProTable<SyncTask>
        ref={tableRef}
        data={query.data}
        loading={query.loading}
        error={query.error}
        options={options}
        schema={{
          tableColumns: columns,
          searchItems: [
            { prop: 'task_no', label: '任务编号', render: 'Input' },
            {
              prop: 'title',
              label: '任务名称',
              render: 'Input',
              renderProps: { placeholder: '完整任务名称' },
            },
            {
              prop: 'status',
              label: '任务状态',
              render: 'Select',
              renderProps: {
                options: [
                  { label: '全部', value: '' },
                  ...Object.entries(statusLabels)
                    .filter(([value]) => value !== 'timed_out')
                    .map(([value, label]) => ({ value, label })),
                ],
              },
            },
            {
              prop: 'trigger_type',
              label: '触发方式',
              render: 'Select',
              renderProps: {
                options: [
                  { label: '全部', value: '' },
                  ...Object.entries(triggerLabels).map(([value, label]) => ({ value, label })),
                ],
              },
            },
          ],
        }}
      />
      <MaDrawer
        open={detailId !== null}
        onOpenChange={open => {
          if (!open) setDetailId(null)
        }}
        title="同步任务详情"
        description="查看执行单元、结果与重试历史。"
        footer={false}
      >
        {detailId && <TaskDetails key={detailId} id={detailId} />}
      </MaDrawer>
      <MaDialog {...confirm.dialogProps} cancelText="返回" />
    </section>
  )
}
