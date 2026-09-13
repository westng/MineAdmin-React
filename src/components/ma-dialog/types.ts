import type { CSSProperties, ReactNode } from 'react'
import type { Dialog } from '@base-ui/react/dialog'

export type InteractionType = Parameters<Extract<NonNullable<Dialog.Popup.Props['initialFocus']>, (...args: never[]) => unknown>>[0]

export type MaDialogAction = 'ok' | 'cancel'

export type MaDialogActionContext = {
  close: () => void
  setLoading: (loading: boolean) => void
}

export type MaDialogActionHandler = (
  context: MaDialogActionContext,
) => void | boolean | Promise<void | boolean>

export type MaDialogActionErrorHandler = (
  error: unknown,
  action: MaDialogAction,
) => void

export type MaDialogSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

export type DialogRootActions = Dialog.Root.Actions

export interface MaDialogProps<Payload = unknown> extends Dialog.Root.Props<Payload> {
  // Ma custom props
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode | false
  footerBefore?: ReactNode
  footerAfter?: ReactNode
  okText?: ReactNode
  cancelText?: ReactNode
  onOk?: MaDialogActionHandler
  onCancel?: MaDialogActionHandler
  onActionError?: MaDialogActionErrorHandler
  loading?: boolean
  fullscreen?: boolean
  defaultFullscreen?: boolean
  onFullscreenChange?: (fullscreen: boolean) => void
  showFullscreenButton?: boolean
  showCloseButton?: boolean
  size?: MaDialogSize
  /** 固定高度；未传时随内容自适应，数字按像素处理。 */
  height?: CSSProperties['height']
  /** 最大高度；默认保留 2rem 视口留白，超出时正文滚动。 */
  maxHeight?: CSSProperties['maxHeight']
  contentClassName?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string

  // DialogContent (Popup) props
  initialFocus?: Dialog.Popup.Props['initialFocus']
  finalFocus?: Dialog.Popup.Props['finalFocus']
  popupProps?: Omit<Dialog.Popup.Props, 'children'>
  portalProps?: Omit<Dialog.Portal.Props, 'children'>
  backdropProps?: Dialog.Backdrop.Props
  closeProps?: Dialog.Close.Props
}

export type MaDialogStaticProps = Omit<
  MaDialogProps,
  'open' | 'defaultOpen' | 'onOpenChange' | 'children'
>

export type UseMaDialogOptions = MaDialogStaticProps

export interface MaDialogController<TArgs extends unknown[] = unknown[]> {
  isOpen: boolean
  args: TArgs
  props: MaDialogProps
  open: (...args: TArgs) => void
  close: () => void
  setTitle: (title: ReactNode) => void
  setAttr: (attributes: Partial<MaDialogStaticProps>) => void
  setAttributes: (attributes: Partial<MaDialogStaticProps>) => void
}
