import type { ReactNode } from 'react'
import type { RouteMeta } from '@/types/global'

export interface AppRoute {
  name: string
  path: string
  element?: ReactNode
  accessMeta?: RouteMeta[]
  meta?: RouteMeta
  children?: AppRoute[]
}
