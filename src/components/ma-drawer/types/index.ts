import type { ReactNode } from 'react'
import type { Dialog } from '@base-ui/react/dialog'

export type InteractionType = Parameters<
  Extract<NonNullable<Dialog.Popup.Props['initialFocus']>, (...args: never[]) => unknown>
>[0]

export type MaDrawerAction = 'ok' | 'cancel'

export type MaDrawerActionContext = {
  close: () => void
  setLoading: (loading: boolean) => void
}

export type MaDrawerActionHandler = (context: MaDrawerActionContext) => void | boolean | Promise<void | boolean>

export type MaDrawerActionErrorHandler = (error: unknown, action: MaDrawerAction) => void

export type MaDrawerFooterAlign = 'left' | 'center' | 'right'

export type DialogRootActions = Dialog.Root.Actions

export interface MaDrawerDefaultHeaderOptions {
  /** 默认基础样式，仅展示标题和说明。 */
  variant?: 'default'
}

export interface MaDrawerStyleOneHeaderOptions {
  /** 样式一：编号、标题状态、说明、操作与底部扩展区。 */
  variant: 'style-1'
  /** 编号、分类等辅助信息，过长时截断。 */
  meta?: ReactNode
  /** 紧邻辅助信息的内容，例如复制编号按钮。 */
  metaExtra?: ReactNode
  /** 状态等标题附加内容，窄抽屉内自动换行。 */
  titleExtra?: ReactNode
  /** 说明前的装饰图标，与换行后的文字保持独立对齐。 */
  descriptionIcon?: ReactNode
  /** 业务操作；关闭按钮仍由 MaDrawer 提供。 */
  actions?: ReactNode
  /** 说明下方的主要业务操作，位于头部分隔线之前。 */
  toolbar?: ReactNode
  /** 固定在头部下方的 Tabs 或工具栏，共用抽屉横向间距。 */
  bottom?: ReactNode
}

export type MaDrawerHeaderOptions = MaDrawerDefaultHeaderOptions | MaDrawerStyleOneHeaderOptions

export type MaDrawerHeaderVariant = NonNullable<MaDrawerHeaderOptions['variant']>

export type MaDrawerHeaderProps = MaDrawerHeaderOptions & {
  title?: ReactNode
  description?: ReactNode
  className?: string
}

export interface MaDrawerProps<Payload = unknown> extends Dialog.Root.Props<Payload> {
  // Ma custom props
  title?: ReactNode
  description?: ReactNode
  /** 默认基础样式；显式选择 variant 启用其他样式；false 用于组合 MaDrawerHeader。 */
  header?: MaDrawerHeaderOptions | false
  footer?: ReactNode | false
  footerBefore?: ReactNode
  footerAfter?: ReactNode
  footerAlign?: MaDrawerFooterAlign
  okText?: ReactNode
  cancelText?: ReactNode
  onOk?: MaDrawerActionHandler
  onCancel?: MaDrawerActionHandler
  onActionError?: MaDrawerActionErrorHandler
  loading?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  width?: string | number
  /** 左右抽屉默认支持拖动边缘调宽，仅影响当前打开会话。 */
  resizable?: boolean
  showCloseButton?: boolean
  contentClassName?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string

  // SheetContent (Popup) props
  initialFocus?: Dialog.Popup.Props['initialFocus']
  finalFocus?: Dialog.Popup.Props['finalFocus']
  popupProps?: Omit<Dialog.Popup.Props, 'children'>
  portalProps?: Omit<Dialog.Portal.Props, 'children'>
  backdropProps?: Dialog.Backdrop.Props
  closeProps?: Dialog.Close.Props
}

export type MaDrawerStaticProps = Omit<MaDrawerProps, 'open' | 'defaultOpen' | 'onOpenChange' | 'children'>

export type UseMaDrawerOptions = MaDrawerStaticProps

export interface MaDrawerController<TArgs extends unknown[] = unknown[]> {
  isOpen: boolean
  args: TArgs
  props: MaDrawerProps
  open: (...args: TArgs) => void
  close: () => void
  setTitle: (title: ReactNode) => void
  /** 替换头部配置；undefined 恢复基础样式，false 隐藏默认头部以便组合。 */
  setHeader: (header: MaDrawerProps['header']) => void
  setAttr: (attributes: Partial<MaDrawerStaticProps>) => void
  setAttributes: (attributes: Partial<MaDrawerStaticProps>) => void
}
