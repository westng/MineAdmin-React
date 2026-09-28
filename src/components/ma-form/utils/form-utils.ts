import type * as React from 'react'
import type { MaFormItem, MaFormModel } from '../types'

export function resolveProp<T extends MaFormModel>(prop: MaFormItem<T>['prop'], model: T): string | undefined {
  if (typeof prop === 'function') return prop(model)
  return prop
}

export function setPathValue<T extends MaFormModel>(source: T, path: string, nextValue: unknown): T {
  const keys = path.split('.').filter(Boolean)
  if (!keys.length) return source
  if (keys.some(key => ['__proto__', 'constructor', 'prototype'].includes(key))) throw new Error('Unsafe field path')
  const result = { ...source } as Record<string, unknown>
  let cursor: Record<string, unknown> = result
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = nextValue
      return
    }
    const child = cursor[key]
    cursor[key] = Array.isArray(child)
      ? [...child]
      : child && typeof child === 'object'
        ? { ...(child as Record<string, unknown>) }
        : /^\d+$/.test(keys[index + 1])
          ? []
          : {}
    cursor = cursor[key] as Record<string, unknown>
  })
  return result as T
}

export function readLabel<T extends MaFormModel>(label: MaFormItem<T>['label']): React.ReactNode {
  return typeof label === 'function' ? label() : label
}

/** Form values are compared structurally; dates and files retain their value semantics. */
export function equalFormValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime()
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) !== Array.isArray(right)) return false
  const prototype = Object.getPrototypeOf(left)
  if (
    prototype !== Object.getPrototypeOf(right) ||
    (!Array.isArray(left) && prototype !== Object.prototype && prototype !== null)
  )
    return false
  const a = left as Record<string, unknown>,
    b = right as Record<string, unknown>
  const keys = Object.keys(a)
  return (
    keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equalFormValue(a[key], b[key]))
  )
}
