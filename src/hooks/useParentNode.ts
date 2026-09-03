import type { RefObject } from 'react'

export function useParentNode<T extends HTMLElement>(ref: RefObject<HTMLElement | null>) {
  return (ref.current?.parentElement as T | null) || null
}
