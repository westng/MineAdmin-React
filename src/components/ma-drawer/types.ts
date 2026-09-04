import type { ReactNode } from 'react'

export type MaDrawerAction = 'ok' | 'cancel'

export type MaDrawerActionContext = {
  close: () => void
  setLoading: (loading: boolean) => void
}

export type MaDrawerActionHandler = (
  context: MaDrawerActionContext,
) => void | boolean | Promise<void | boolean>

export type MaDrawerActionErrorHandler = (
  error: unknown,
  action: MaDrawerAction,
) => void

export interface MaDrawerProps {
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
  onOk?: MaDrawerActionHandler
  onCancel?: MaDrawerActionHandler
  onActionError?: MaDrawerActionErrorHandler
  loading?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  showCloseButton?: boolean
  disablePointerDismissal?: boolean
  contentClassName?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
}

export type MaDrawerStaticProps = Omit<
  MaDrawerProps,
  'open' | 'defaultOpen' | 'onOpenChange' | 'children'
>

export type UseMaDrawerOptions = MaDrawerStaticProps

export interface MaDrawerController<TArgs extends unknown[] = unknown[]> {
  isOpen: boolean
  args: TArgs
  props: MaDrawerProps
  open: (...args: TArgs) => void
  close: () => void
  setTitle: (title: ReactNode) => void
  setAttr: (attributes: Partial<MaDrawerStaticProps>) => void
  setAttributes: (attributes: Partial<MaDrawerStaticProps>) => void
}
