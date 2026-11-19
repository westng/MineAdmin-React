import type { MaProTableColumns } from '@/components/ma-pro-table'
import type { TextTranslator } from '@/services/i18n/translator'
import type { SyncTask } from '../../api'
import { displayError, displayTime, isActive, statusLabels, triggerLabels } from './display'
export function getTableColumns({
  tx,
  hasAuth,
  busyId,
  onDetail,
  onAction,
}: {
  tx: TextTranslator
  hasAuth: (permission: string) => boolean
  busyId: string | null
  onDetail: (id: string) => void
  onAction: (row: SyncTask, action: 'retry' | 'cancel') => void
}): MaProTableColumns<SyncTask>[] {
  return [
    { prop: 'task_no', label: tx('任务编号'), width: 240 },
    { prop: 'title', label: tx('同步任务'), width: 150 },
    {
      prop: 'platform',
      label: tx('平台'),
      width: 110,
      cellRender: ({ row }) =>
        ({ pdd: tx('拼多多'), doudian: tx('抖店'), wangdian: tx('旺店通'), oceanengine: tx('巨量引擎') })[
          row.platform
        ] || row.platform,
    },
    {
      prop: 'trigger_type',
      label: tx('触发方式'),
      width: 110,
      cellRender: ({ row }) => tx(triggerLabels[row.trigger_type] || row.trigger_type),
    },
    {
      prop: 'status',
      label: tx('状态'),
      width: 110,
      cellRender: ({ row }) => (
        <span className={['failed', 'partial_success'].includes(row.status) ? 'text-destructive' : undefined}>
          {tx(statusLabels[row.status] || row.status)}
        </span>
      ),
    },
    {
      prop: 'persisted_count',
      label: tx('确认完成 / 发现'),
      width: 140,
      cellRender: ({ row }) => `${row.persisted_count} / ${row.discovered_count}`,
    },
    { prop: 'created_at', label: tx('提交时间'), width: 185, cellRender: ({ row }) => displayTime(row.created_at) },
    {
      prop: 'error_code',
      label: tx('结果说明'),
      width: 240,
      cellRender: ({ row }) =>
        row.status === 'succeeded' && Number(row.discovered_count) === 0
          ? tx('同步成功，范围内无数据')
          : tx(displayError(row.error_code)),
    },
    {
      type: 'operation',
      label: tx('操作'),
      width: 210,
      operationConfigure: {
        type: 'auto',
        actions: [
          {
            name: 'detail',
            text: tx('详情'),
            show: () => hasAuth('log:sync:list'),
            disabled: ({ row }) => busyId === row.id,
            onClick: ({ row }) => onDetail(row.id),
          },
          ...(hasAuth('log:sync:retry')
            ? [
                {
                  name: 'retry',
                  text: tx('重试'),
                  disabled: ({ row }: { row: SyncTask }) =>
                    busyId === row.id || !['failed', 'partial_success'].includes(row.status),
                  onClick: ({ row }: { row: SyncTask }) => onAction(row, 'retry'),
                },
              ]
            : []),
          ...(hasAuth('log:sync:cancel')
            ? [
                {
                  name: 'cancel',
                  text: tx('取消'),
                  disabled: ({ row }: { row: SyncTask }) =>
                    busyId === row.id || !isActive(row.status) || row.status === 'cancelling',
                  onClick: ({ row }: { row: SyncTask }) => onAction(row, 'cancel'),
                },
              ]
            : []),
        ],
      },
    },
  ]
}
