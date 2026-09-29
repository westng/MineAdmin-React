import type { ComponentProps, ReactNode } from 'react'

export type MaEmptyType = 'search' | 'simple'
export type MaEmptySize = 'default' | 'sm'
export type MaEmptySlot = 'header' | 'image' | 'title' | 'description' | 'content' | 'actions'

export interface MaEmptyProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** 默认使用 ReUI 官方 c-empty-16 堆叠文件卡片插画。 */
  type?: MaEmptyType
  size?: MaEmptySize
  title?: ReactNode
  description?: ReactNode
  /** 自定义装饰性插画；null / false 隐藏插画。 */
  image?: ReactNode
  actions?: ReactNode
  classNames?: Partial<Record<MaEmptySlot, string>>
}
