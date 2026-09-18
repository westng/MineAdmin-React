import type { ComponentType } from 'react'
import { createRegistry } from '@/services/registry'
export type ShellSlotName =
  | 'shell.overlays'
  | 'shell.toolbar'
  | 'shell.pane'
  | 'auth.methods'
  | 'account.preferences'
  | 'account.bindings'
  | 'settings.extensions'
  | 'notifications'
export interface ShellSlotProps {
  pathname?: string
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
export const shellSlots = createRegistry<ShellSlotRegistration>()
export const registerShellSlot = shellSlots.register
export interface ShellPagePolicy {
  id: string
  path: string
  padding?: boolean
  overflow?: 'auto' | 'hidden'
  order?: number
}
export const shellPagePolicies = createRegistry<ShellPagePolicy>()
