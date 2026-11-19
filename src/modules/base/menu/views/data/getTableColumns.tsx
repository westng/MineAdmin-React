import { Trash2 } from 'lucide-react'
import type { MaProTableColumns } from '@/components/ma-pro-table'
import { Input } from '@/components/reui/primitives/input'
import type { TextTranslator } from '@/services/i18n/translator'
import type { ButtonPermission } from './menu-form'
export type ButtonPermissionRow = ButtonPermission & {
  onUpdate: (field: 'title' | 'code', value: string) => void
  onRemove: () => void
}
export function getTableColumns(tx: TextTranslator): MaProTableColumns<ButtonPermissionRow>[] {
  return [
    {
      prop: 'title',
      label: tx('按钮名称'),
      cellRender: ({ row }) => (
        <Input
          value={row.title}
          onChange={event => row.onUpdate('title', event.target.value)}
          placeholder={tx('例如：菜单列表')}
          aria-label={tx('按钮名称')}
        />
      ),
      width: 200,
      className: 'overflow-visible',
    },
    {
      prop: 'code',
      label: tx('按钮编码'),
      cellRender: ({ row }) => (
        <Input
          value={row.code}
          onChange={event => row.onUpdate('code', event.target.value)}
          placeholder={tx('例如：permission:menu:index')}
          aria-label={tx('按钮编码')}
        />
      ),
      width: 300,
      className: 'overflow-visible',
    },
    {
      type: 'operation',
      label: tx('操作'),
      width: 50,
      operationConfigure: {
        type: 'tile',
        actions: [
          {
            name: 'remove',
            text: '',
            ariaLabel: tx('删除按钮权限'),
            icon: <Trash2 aria-hidden="true" />,
            variant: 'ghost',
            size: 'icon-sm',
            onClick: ({ row }) => row.onRemove(),
          },
        ],
      },
    },
  ]
}
