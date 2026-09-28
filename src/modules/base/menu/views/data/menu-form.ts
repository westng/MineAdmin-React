import type { MenuVo } from '../../api/menu'
import { getMenuType } from '@/router/navigation/menu'

/** 页面所在目录，和 Vue 版菜单的 `meta.componentPath` 一致。 */
export type ComponentSource = 'modules/' | 'plugins/'
export const toComponentSource = (value: unknown): ComponentSource =>
  typeof value === 'string' && value.trim().replace(/\/?$/, '/') === 'plugins/' ? 'plugins/' : 'modules/'

export type ButtonPermission = {
  id?: number
  title: string
  code: string
  i18n?: string
}

export type MenuForm = {
  id?: number
  parent_id?: number
  title: string
  i18n: string
  name: string
  path: string
  component: string
  componentPath: ComponentSource
  meta: NonNullable<MenuVo['meta']>
  redirect: string
  type: string
  icon: string
  link: string
  sort: number
  status: number
  btnPermission: ButtonPermission[]
}

export const emptyForm: MenuForm = {
  title: '',
  i18n: '',
  name: '',
  path: '',
  component: '',
  componentPath: 'modules/',
  meta: {},
  redirect: '',
  type: 'M',
  icon: '',
  link: '',
  sort: 0,
  status: 1,
  btnPermission: [],
}

export function toForm(menu: MenuVo): MenuForm {
  const btnPermission: ButtonPermission[] = []
  if (menu.children && menu.children.length > 0) {
    menu.children
      .filter(child => getMenuType(child) === 'B')
      .forEach(btn => {
        btnPermission.push({
          id: btn.id,
          title: btn.meta?.title || '',
          code: btn.name || '',
          i18n: btn.meta?.i18n || '',
        })
      })
  }

  return {
    id: menu.id,
    parent_id: menu.parent_id,
    title: menu.meta?.title || menu.name || '',
    i18n: menu.meta?.i18n || '',
    name: menu.name || '',
    path: menu.path || menu.route || '',
    component: menu.component || '',
    componentPath: toComponentSource(menu.meta?.componentPath),
    meta: { ...menu.meta },
    redirect: menu.redirect || '',
    type: getMenuType(menu),
    icon: menu.icon || menu.meta?.icon || '',
    link: typeof menu.meta?.link === 'string' ? menu.meta.link : '',
    sort: menu.sort || 0,
    status: menu.status || 1,
    btnPermission,
  }
}

export function toPayload(form: MenuForm): MenuVo {
  const meta = { ...form.meta }
  delete meta.componentSuffix
  return {
    id: form.id,
    parent_id: form.parent_id || 0,
    name: form.name,
    path: form.path,
    route: form.path,
    component: form.component,
    redirect: form.redirect,
    type: form.type,
    icon: form.icon,
    status: form.status,
    sort: form.sort,
    meta: {
      ...meta,
      title: form.title,
      i18n: form.i18n,
      type: form.type,
      icon: form.icon,
      link: form.link || undefined,
      ...(form.type === 'M'
        ? {
            componentPath: form.componentPath,
          }
        : {}),
    },
    btnPermission: form.btnPermission.map(button => ({
      ...button,
      type: 'B',
      i18n: button.i18n || '',
    })),
  }
}

export function flattenMenus(menus: MenuVo[], result: MenuVo[] = []) {
  menus.forEach(menu => {
    result.push(menu)
    if (menu.children) flattenMenus(menu.children, result)
  })
  return result
}
