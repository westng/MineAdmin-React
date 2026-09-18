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

export interface MaDrawerProps<Payload = unknown> extends Dialog.Root.Props<Payload> {
  // Ma custom props
  title?: ReactNode
  description?: ReactNode
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
  setAttr: (attributes: Partial<MaDrawerStaticProps>) => void
  setAttributes: (attributes: Partial<MaDrawerStaticProps>) => void
}
