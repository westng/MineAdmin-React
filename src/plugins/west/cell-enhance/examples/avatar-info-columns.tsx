import type { MaProTableColumns } from '@/components/ma-pro-table/types'
import type { MaTableColumn } from '@/components/ma-table/types'
import type { CellEnhanceRenderTo } from '../types'

export type AvatarInfoExampleRow = {
  id: number
  user: { avatar?: string; nickname: string; title?: string }
  membership?: { label: string }
  active: boolean
}

export function createAvatarInfoColumns(): MaTableColumn<AvatarInfoExampleRow>[] {
  return [
    {
      label: '用户',
      prop: 'user.nickname',
      minWidth: 240,
      cellRenderTo: {
        name: 'west/cell-enhance',
        props: {
          type: 'avatar-info',
          props: {
            fields: {
              avatar: 'user.avatar',
              name: 'user.nickname',
              badge: 'membership.label',
              description: 'user.title',
            },
          },
        },
      } satisfies CellEnhanceRenderTo<AvatarInfoExampleRow>,
    },
    {
      label: '用户状态',
      prop: row => row.user.nickname,
      minWidth: 240,
      cellRenderTo: {
        name: 'west/cell-enhance',
        props: ({ row }) => ({
          type: 'avatar-info',
          props: {
            fields: { avatar: 'user.avatar', description: 'user.title' },
            badge: row.active ? '已启用' : '已停用',
            badgeProps: { variant: row.active ? 'success-light' : 'secondary' },
          },
        }),
      } satisfies CellEnhanceRenderTo<AvatarInfoExampleRow>,
    },
  ]
}

/** 两类表格复用同一套字段映射与展示配置。 */
export function createAvatarInfoProTableColumns(): MaProTableColumns<AvatarInfoExampleRow>[] {
  return createAvatarInfoColumns()
}
