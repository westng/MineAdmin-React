import type { ReactNode } from 'react'

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

export interface MaDialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
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
  disablePointerDismissal?: boolean
  contentClassName?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
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
