import type * as React from 'react'
import type { MaFormExpose, MaFormItem, MaFormOptions } from '../../ma-form/types'
import type { MaModel } from '../../shared/types'

export type MaSearchModel = MaModel

export interface MaSearchOptions {
  defaultValue?: MaSearchModel
  cols?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }
  labelPlacement?: 'inside' | 'outside'
  fold?: boolean
  foldButtonShow?: boolean
  foldRows?: number
  show?: boolean | (() => boolean)
  text?: {
    searchBtn?: string | (() => string)
    resetBtn?: string | (() => string)
    isFoldBtn?: string | (() => string)
    notFoldBtn?: string | (() => string)
  }
  searchBtnProps?: Record<string, unknown>
  resetBtnProps?: Record<string, unknown>
}

export interface MaSearchItem<T extends MaSearchModel = MaSearchModel> extends MaFormItem<T> {
  span?: number
  offset?: number
}

export interface MaSearchExpose<T extends MaSearchModel = MaSearchModel> {
  getMaFormRef: () => MaFormExpose<T> | null
  foldToggle: () => void
  getFold: () => boolean
  setSearchForm: (form: Partial<T> | null) => void
  getSearchForm: () => T
  setShowState: (show: boolean) => void
  getShowState: () => boolean
  setOptions: (options: MaSearchOptions) => void
  getOptions: () => MaSearchOptions
  setFormOptions: (options: MaFormOptions) => void
  getFormOptions: () => MaFormOptions
  setItems: (items: MaSearchItem<T>[]) => void
  getItems: () => MaSearchItem<T>[]
  appendItem: (item: MaSearchItem<T>) => void
  removeItem: (prop: string) => void
  getItemByProp: (prop: string) => MaSearchItem<T> | null
  setSearchBtnProps: (props: Record<string, unknown>) => void
  setResetBtnProps: (props: Record<string, unknown>) => void
}

export interface MaSearchProps<T extends MaSearchModel = MaSearchModel> {
  options?: MaSearchOptions
  formOptions?: MaFormOptions
  searchItems?: MaSearchItem<T>[]
  items?: MaSearchItem<T>[]
  className?: string
  children?: React.ReactNode
  beforeActions?: React.ReactNode
  afterActions?: React.ReactNode
  actions?: React.ReactNode
  onSearch?: (form: T) => void | Promise<void>
  onReset?: (form: T) => void | Promise<void>
  onFold?: (folded: boolean) => void
}

export type { MaFormExpose, MaFormItem, MaFormOptions }
