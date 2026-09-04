import type * as React from 'react'
import type { MaFormItem, MaFormModel } from '../types'

export function resolveProp<T extends MaFormModel>(prop: MaFormItem<T>['prop'], model: T): string | undefined {
  if (typeof prop === 'function') return prop(model)
  return prop
}

export function setPathValue<T extends MaFormModel>(source: T, path: string, nextValue: unknown): T {
  const keys = path.split('.').filter(Boolean)
  if (!keys.length) return source
  const result = { ...source } as Record<string, unknown>
  let cursor: Record<string, unknown> = result
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = nextValue
      return
    }
    const child = cursor[key]
    cursor[key] = child && typeof child === 'object' ? { ...(child as Record<string, unknown>) } : {}
    cursor = cursor[key] as Record<string, unknown>
  })
  return result as T
}

export function readLabel<T extends MaFormModel>(label: MaFormItem<T>['label']): React.ReactNode {
  return typeof label === 'function' ? label() : label
}
