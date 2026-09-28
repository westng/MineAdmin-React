import { createElement, type ComponentType } from 'react'
import type { MenuVo } from '@/services/navigation/types'
import type { RouteBreadcrumb, RouteMeta } from '@/router/types'
import IframeView from '@/layouts/components/iframe'
import {
  getMenuLabel,
  getMenuLink,
  getMenuPath,
  getMenuType,
  isEnabledMenu,
  isVisibleMenu,
} from '@/router/navigation/menu'
import type { AppRoute, ViewFiles, ViewLoader, ViewResolver } from './types'
import { AsyncView } from './async-view'

/** 页面表只做文件查找，不注册路由，也不维护组件实例。 */
export function createViewResolver(files: ViewFiles = {}, isPluginEnabled?: (name: string) => boolean): ViewResolver {
  const table = new Map<string, ViewLoader | undefined>()
  for (const [file, loader] of Object.entries(files)) {
    const key = file.replace(/^.*?(?=(?:modules|plugins)\/)/, '').replace(/\.(tsx|jsx)$/, '')
    table.set(key, table.has(key) ? undefined : loader)
  }
  const resolve: ViewResolver['resolve'] = (component, source) => {
    if (!component?.trim() || (source != null && typeof source !== 'string')) return undefined
    const path = component
      .trim()
      .replace(/^\/+/, '')
      .replace(/\.(vue|tsx|jsx)$/, '')
    const root = typeof source === 'string' ? source.trim().replace(/^\/+|\/+$/g, '') : source
    if (root && root !== 'modules' && root !== 'plugins') return undefined
    const matches = (root ? [root] : ['modules', 'plugins'])
      .map(base => `${base}/${path}`)
      .filter(key => table.has(key))
    if (matches.length !== 1) return undefined
    const key = matches[0]
    if (key.startsWith('plugins/') && isPluginEnabled && !isPluginEnabled(key.split('/').slice(1, 3).join('/')))
      return undefined
    return table.get(key)
  }
  return { resolve, has: (component, source) => Boolean(resolve(component, source)), keys: () => [...table.keys()] }
}

const pages = new WeakMap<ViewLoader, ComponentType>()
function page(loader?: ViewLoader) {
  if (!loader) return undefined
  let component = pages.get(loader)
  if (!component) {
    component = () => createElement(AsyncView, { loader })
    pages.set(loader, component)
  }
  return createElement(component)
}
const keyOf = (path: string) => path.toLowerCase().replace(/:[\w-]+(?=\/|\?|$)/g, ':param')

/** 类似 Vue 的 menuToRoutes + flatteningRoutes：一次遍历，得到菜单树与可直接渲染的路由。 */
export function menuToRoutes(
  input: MenuVo[],
  codeRoutes: readonly AppRoute[] = [],
  views = createViewResolver(),
  origin?: string,
) {
  const routes = new Map<string, AppRoute>()
  const codeRedirects = new Map<string, AppRoute['redirect']>()
  for (const code of codeRoutes) {
    const path = getMenuPath({ path: code.path })
    if (!path || ['/', '/login', '/*'].includes(path.toLowerCase())) continue
    const key = keyOf(path)
    const previous = routes.get(key)
    if (previous) {
      previous.accessMeta?.push(...(code.accessMeta ?? []), ...(code.meta ? [code.meta] : []))
      continue
    }
    const crumb = { name: code.name, path, title: code.meta?.title, i18n: code.meta?.i18n, icon: code.meta?.icon }
    routes.set(key, {
      ...code,
      path,
      element: code.element ?? page(code.component),
      meta: { ...code.meta, breadcrumb: code.meta?.breadcrumb ?? [crumb] },
      accessMeta: [...(code.accessMeta ?? []), ...(code.meta ? [code.meta] : [])],
    })
    if (code.redirect !== undefined) codeRedirects.set(key, code.redirect)
  }
  const visit = (
    items: MenuVo[],
    parent: string,
    trail: RouteBreadcrumb[],
    access: RouteMeta[],
  ): { menus: MenuVo[]; targets: string[] } => {
    const menus: MenuVo[] = [],
      targets: string[] = []
    for (const raw of items) {
      const path = getMenuPath(raw, parent)
      const type = getMenuType(raw),
        meta = (raw.meta ?? {}) as RouteMeta
      const link = ['I', 'L'].includes(type) ? getMenuLink(raw, origin) : undefined
      const breadcrumb = [
        ...trail,
        { name: raw.name, path: path ?? undefined, title: getMenuLabel(raw), i18n: meta.i18n, icon: meta.icon },
      ]
      const policy = [...access, meta]
      const key = path ? keyOf(path) : ''
      const valid =
        isEnabledMenu(raw) &&
        path &&
        !['/', '/login', '/*'].includes(path.toLowerCase()) &&
        (raw.path || raw.route) !== '*'
      let route: AppRoute | undefined
      if (valid) {
        const existing = routes.get(key)
        const loader = views.resolve(raw.component, meta.componentPath)
        const element =
          existing?.element ??
          (type === 'I' && link ? (
            <IframeView src={link} title={getMenuLabel(raw)} />
          ) : type === 'L' && link ? (
            <a href={link} target="_blank" rel="noreferrer">
              {getMenuLabel(raw)}
            </a>
          ) : !['I', 'L'].includes(type) ? (
            page(loader)
          ) : undefined)
        route = {
          name: existing?.name || raw.name || path,
          path: existing?.path || path,
          element,
          redirect: codeRedirects.get(key) ?? (existing?.element ? undefined : raw.redirect || undefined),
          meta: { ...existing?.meta, ...meta, breadcrumb },
          accessMeta: [...(existing?.accessMeta ?? []), ...policy],
        }
        routes.set(key, route)
      }
      const children = isEnabledMenu(raw)
        ? visit(raw.children ?? [], path || parent, isVisibleMenu(raw) ? breadcrumb : trail, policy)
        : { menus: raw.children ?? [], targets: [] }
      menus.push({
        ...raw,
        ...(path && (raw.path || raw.route) !== '*' ? { path } : {}),
        meta: { ...raw.meta, ...(link ? { link } : {}) },
        ...(raw.children ? { children: children.menus } : {}),
      })
      // 虚拟根菜单只提供层级；目录的目标在本次遍历中一并收集。
      if (
        route &&
        routes.get(key) === route &&
        !route.element &&
        !route.redirect &&
        !raw.component &&
        !['I', 'L'].includes(type)
      )
        route.redirect = children.targets
      if (isVisibleMenu(raw)) {
        const target = routes.get(key)
        if (valid && target && (target.element || typeof target.redirect === 'string')) targets.push(target.path)
        else targets.push(...children.targets)
      }
    }
    return { menus, targets }
  }
  const { menus } = visit(input, '', [], [])
  return { menus, routes: [...routes.values()] }
}
