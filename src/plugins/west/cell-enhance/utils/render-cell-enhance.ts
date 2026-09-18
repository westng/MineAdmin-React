import { createElement } from 'react'
import type { MaTableCellContext, MaTableModel } from '@/components/ma-table/types'
import { AvatarInfoCell } from '../components/avatar-info-cell'
import { BadgeCell } from '../components/badge-cell'
import { ProductInfoCell } from '../components/product-info-cell'
import type { CellEnhanceConfig } from '../types'
import { resolveAvatarInfoProps } from './avatar-info-utils'
import { resolveProductInfoProps } from './product-info-utils'

function isCellEnhanceConfig(value: unknown): value is CellEnhanceConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('type' in value)) return false
  if (value.type !== 'badge' && value.type !== 'avatar-info' && value.type !== 'product-info') return false
  if (!('props' in value) || value.props === undefined) return true
  const props = value.props
  if (props === null || typeof props !== 'object' || Array.isArray(props)) return false

  if (value.type === 'avatar-info' || value.type === 'product-info') {
    if ('fields' in props && props.fields !== undefined) {
      if (!props.fields || typeof props.fields !== 'object' || Array.isArray(props.fields)) return false
      if (Object.values(props.fields).some(field => field !== undefined && (typeof field !== 'string' || !field.trim()))) return false
    }
    if ('badgeProps' in props && props.badgeProps !== undefined && (!props.badgeProps || typeof props.badgeProps !== 'object' || Array.isArray(props.badgeProps))) return false
    if (value.type === 'avatar-info') {
      return !('avatarSize' in props) || props.avatarSize === undefined
        || (typeof props.avatarSize === 'string' && ['default', 'sm', 'lg'].includes(props.avatarSize))
    }
    return !('imageSize' in props) || props.imageSize === undefined
      || (typeof props.imageSize === 'string' && ['default', 'sm', 'lg'].includes(props.imageSize))
  }

  if ('dictName' in props && props.dictName !== undefined && typeof props.dictName !== 'string') return false
  if ('options' in props && props.options !== undefined && !Array.isArray(props.options)) return false
  return !('optionProps' in props) || props.optionProps === undefined || typeof props.optionProps === 'function'
}

export function renderCellEnhance<T extends MaTableModel>(context: MaTableCellContext<T>, config: unknown) {
  if (!isCellEnhanceConfig(config)) return context.value == null || context.value === '' ? '-' : String(context.value)
  if (config.type === 'avatar-info') return createElement(AvatarInfoCell, resolveAvatarInfoProps(context, config.props))
  if (config.type === 'product-info') return createElement(ProductInfoCell, resolveProductInfoProps(context, config.props))
  return createElement(BadgeCell, { ...config.props, value: context.value })
}
