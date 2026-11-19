import type { MaSearchItem } from '@/components/ma-search'
import type { TextTranslator } from '@/services/i18n/translator'
import type { SyncTask } from '../../api'
import { statusLabels, triggerLabels } from './display'
export function getSearchItems(tx: TextTranslator): MaSearchItem<SyncTask>[] {
  return [
    { prop: 'task_no', label: tx('任务编号'), render: 'Input' },
    {
      prop: 'title',
      label: tx('任务名称'),
      render: 'Input',
      renderProps: { placeholder: tx('完整任务名称') },
    },
    {
      prop: 'status',
      label: tx('任务状态'),
      render: 'Select',
      renderProps: {
        options: [
          { label: tx('全部'), value: '' },
          ...Object.entries(statusLabels)
            .filter(([value]) => value !== 'timed_out')
            .map(([value, label]) => ({ value, label: tx(label) })),
        ],
      },
    },
    {
      prop: 'trigger_type',
      label: tx('触发方式'),
      render: 'Select',
      renderProps: {
        options: [
          { label: tx('全部'), value: '' },
          ...Object.entries(triggerLabels).map(([value, label]) => ({ value, label: tx(label) })),
        ],
      },
    },
  ]
}
