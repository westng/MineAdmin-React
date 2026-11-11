import type { MaDrawerHeaderProps } from '../types'
import { MaDrawerDefaultHeader } from './ma-drawer-default-header'
import { MaDrawerStyleOneHeader } from './ma-drawer-style-one-header'

/** 统一样式入口。每种内置样式独立实现，基础样式不根据内容自动切换。 */
export function MaDrawerHeader(props: MaDrawerHeaderProps) {
  if (props.variant === 'style-1') return <MaDrawerStyleOneHeader {...props} />
  return <MaDrawerDefaultHeader {...props} />
}
