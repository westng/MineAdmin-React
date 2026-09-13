import type { ComponentProps, ReactNode } from 'react'
import type { BadgeProps } from '@/components/reui/badge'
import type { Avatar } from '@/components/ui/avatar'

export type AvatarInfoCellText = string | number | null

/** 相对于当前行的字段路径，支持 user.nickname 等嵌套字段。 */
export interface AvatarInfoCellFields {
  avatar?: string
  name?: string
  badge?: string
  description?: string
}

export interface AvatarInfoCellProps extends Omit<ComponentProps<'div'>, 'children'> {
  avatar?: string | null
  name?: AvatarInfoCellText
  badge?: AvatarInfoCellText
  description?: AvatarInfoCellText
  /** 头像缺失或加载失败时显示；默认取姓名缩写。 */
  fallback?: string
  /** 全部内容为空或名称缺失时的占位，默认 -。 */
  emptyText?: ReactNode
  avatarSize?: ComponentProps<typeof Avatar>['size']
  badgeProps?: Omit<BadgeProps, 'children'>
}

export interface AvatarInfoCellOptions extends AvatarInfoCellProps {
  /** 指定的字段优先于直接传值；未指定 name 字段或值时使用当前列值。 */
  fields?: AvatarInfoCellFields
}
