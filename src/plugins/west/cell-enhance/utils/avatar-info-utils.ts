import type { MaTableCellContext, MaTableModel } from '@/components/ma-table/types'
import { getPathValue } from '@/components/shared/path'
import type { AvatarInfoCellOptions, AvatarInfoCellProps } from '../types/avatar-info'

export function avatarInfoText(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

export function avatarInfoInitials(name: string | undefined): string {
  if (!name) return '?'
  const words = name.split(/\s+/)
  return words.length > 1
    ? (Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]).toUpperCase()
    : Array.from(name).slice(0, 2).join('').toUpperCase()
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
