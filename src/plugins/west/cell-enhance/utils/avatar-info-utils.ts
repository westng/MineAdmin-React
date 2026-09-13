import type { MaTableCellContext, MaTableModel } from '@/components/ma-table/types'
import { getPathValue } from '@/components/shared/path'
import type { AvatarInfoCellOptions, AvatarInfoCellProps } from '../types/avatar-info'

export function avatarInfoText(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

export function avatarInfoInitials(name: string | undefined): string {
  return Array.from(name?.trim() ?? '')[0] ?? '?'
}

/** 字段只从当前行读取，展示配置不透传到 DOM。 */
export function resolveAvatarInfoProps<T extends MaTableModel>(
  context: MaTableCellContext<T>,
  options: AvatarInfoCellOptions = {},
): AvatarInfoCellProps {
  const { fields = {}, ...props } = options
  const fieldValue = (field: string | undefined, value: unknown) => field === undefined ? value : getPathValue(context.row, field)
  const avatar = fieldValue(fields.avatar, props.avatar)

  return {
    ...props,
    avatar: typeof avatar === 'string' ? avatarInfoText(avatar) : undefined,
    name: avatarInfoText(fieldValue(fields.name, props.name === undefined ? context.value : props.name)),
    badge: avatarInfoText(fieldValue(fields.badge, props.badge)),
    description: avatarInfoText(fieldValue(fields.description, props.description)),
  }
}
