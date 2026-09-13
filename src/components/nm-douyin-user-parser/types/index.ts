import type { ComponentProps } from 'react'

export interface DouyinUser {
  uid: string
  nickname: string
  avatar_thumb?: { url_list: string[]; [key: string]: unknown }
  [key: string]: unknown
}

export interface DouyinUserParserOptions {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  dataHandle?: (user: DouyinUser) => void
  disabled?: boolean
  readOnly?: boolean
}

export type NmDouyinUserParserProps = Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'ref'> & DouyinUserParserOptions
