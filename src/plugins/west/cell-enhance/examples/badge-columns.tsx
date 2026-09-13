import { Check, CirclePause, ExternalLink } from 'lucide-react'
import type { MaProTableColumns } from '@/components/ma-pro-table/types'
import type { MaTableColumn } from '@/components/ma-table/types'
import type { CellEnhanceRenderTo } from '../types'

export type BadgeExampleRow = {
  id: number
  name: string
  status: number
  roles: string[]
}

export function createBadgeColumns(openDetail: (row: BadgeExampleRow) => void): MaTableColumn<BadgeExampleRow>[] {
  return [
    { label: '名称', prop: 'name' },
    {
      label: '状态',
      prop: 'status',
      cellRenderTo: {
        name: 'west/cell-enhance',
        props: {
          type: 'badge',
          props: {
            radius: 'full',
            dictName: 'system-status',
            optionProps: ({ value }) => ({ leading: String(value) === '1' ? <Check /> : <CirclePause /> }),
          },
        },
      } satisfies CellEnhanceRenderTo<BadgeExampleRow>,
    },
    {
      label: '角色',
      prop: 'roles',
      cellRenderTo: {
        name: 'west/cell-enhance',
        props: {
          type: 'badge',
          props: {
            variant: 'secondary',
            size: 'sm',
            options: [
              { value: 'admin', label: '管理员', variant: 'primary-light' },
              { value: 'member', label: '成员', variant: 'secondary' },
            ],
          },
        },
      } satisfies CellEnhanceRenderTo<BadgeExampleRow>,
    },
    {
      label: '详情',
      prop: 'name',
      cellRenderTo: {
        name: 'west/cell-enhance',
        props: ({ row }) => ({
          type: 'badge',
          props: {
            variant: 'primary-outline',
            trailing: <ExternalLink />,
            render: <button type="button" />,
            onClick: event => { event.stopPropagation(); openDetail(row) },
          },
        }),
      } satisfies CellEnhanceRenderTo<BadgeExampleRow>,
    },
  ]
}

/** 两类表格使用同一个 cellRenderTo 契约。 */
export function createProTableBadgeColumns(openDetail: (row: BadgeExampleRow) => void): MaProTableColumns<BadgeExampleRow>[] {
  return createBadgeColumns(openDetail)
}
