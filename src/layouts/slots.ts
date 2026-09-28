import type { ComponentType } from 'react'
export type ShellSlotName =
  | 'shell.overlays'
  | 'shell.toolbar'
  | 'shell.pane'
  | 'shell.section.content'
  | 'auth.methods'
  | 'account.preferences'
  | 'account.bindings'
  | 'settings.extensions'
  | 'notifications'
export interface ShellSlotProps {
  pathname?: string
  sectionPath?: string
  sectionLabel?: string
  userId?: number
  disabled?: boolean
}
export interface ShellSlotRegistration {
  id: string
  slot: ShellSlotName
  component: ComponentType<ShellSlotProps>
  order?: number
  match?: (pathname: string) => boolean
}
export interface ShellPagePolicy {
  id: string
  path: string
  padding?: boolean
  overflow?: 'auto' | 'hidden'
  order?: number
}
