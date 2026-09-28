import type { ComponentType, ReactNode } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ViewLoader = () => Promise<{ default?: ComponentType<any> }>
export type ViewFiles = Readonly<Record<string, ViewLoader>>
export interface ViewResolver {
  resolve: (component?: string | null, source?: unknown) => ViewLoader | undefined
  has: (component?: string | null, source?: unknown) => boolean
  keys: () => string[]
}

/** 静态声明可提供 component；菜单转换后统一生成 element。 */
export interface AppRoute {
  name: string
  path: string
  meta?: RouteMeta
  element?: ReactNode
  component?: ViewLoader
  /** 字符串为显式跳转；数组为目录预先收集的可选页面地址。 */
  redirect?: string | string[]
  accessMeta?: RouteMeta[]
}

export interface RouteBreadcrumb {
  name?: string
  path?: string
  title?: string
  i18n?: string
  icon?: string
}

export interface RouteMeta {
  title?: string
  i18n?: string
  icon?: string
  hidden?: boolean
  type?: string
  cache?: boolean
  copyright?: boolean
  breadcrumbEnable?: boolean
  useDefaultLayout?: boolean
  /** 页面文件所在目录：`modules/`（默认）或 `plugins/`。 */
  componentPath?: string
  /** 从一级菜单到当前页面，由路由拍平时生成。 */
  breadcrumb?: RouteBreadcrumb[]
  /** Legacy menu permission codes; booleans are retained as non-authorizing metadata. */
  auth?: boolean | string | string[]
  role?: string | string[]
  roles?: string | string[]
  permission?: string | string[]
  permissions?: string | string[]
  user?: string | string[]
  affix?: boolean
}
