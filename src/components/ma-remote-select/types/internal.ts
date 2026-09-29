import type { ReactNode } from 'react'
import type { MaRemoteSelectValue } from './index'

export type RemoteOption<T> = {
  value: MaRemoteSelectValue
  label: ReactNode
  raw: T
  disabled: boolean
}
