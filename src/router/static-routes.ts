import type { AppRoute } from './types'
import { dashboardPage } from './dashboard'

const uc = {
  name: 'uc:index',
  path: '/uc/index',
  title: '个人中心',
  i18n: 'menu.uc:index',
  icon: 'heroicons:user-circle',
}

/** 布局内的静态页面：首页和个人中心。登录页和 404 在 `router/index.tsx`。 */
export const staticRoutes: AppRoute[] = [
  {
    name: dashboardPage.name,
    path: dashboardPage.path,
    component: () => import('@/modules/base/dashboard/views'),
    meta: {
      title: dashboardPage.title,
      i18n: 'menu.dashboard',
      icon: dashboardPage.icon,
      affix: true,
      breadcrumb: [{ ...dashboardPage, i18n: 'menu.dashboard' }],
    },
  },
  {
    name: uc.name,
    path: uc.path,
    component: () => import('@/modules/base/user-center/views'),
    meta: { title: uc.title, i18n: uc.i18n, icon: uc.icon, hidden: true, breadcrumb: [uc] },
  },
  {
    name: 'uc:account',
    path: '/uc/account',
    component: () => import('@/modules/base/account-settings/views/index'),
    meta: {
      title: '账号设置',
      i18n: 'menu.uc:account',
      hidden: true,
      breadcrumb: [uc, { name: 'uc:account', path: '/uc/account', title: '账号设置', i18n: 'menu.uc:account' }],
    },
  },
  {
    name: 'uc:settings',
    path: '/uc/settings',
    component: () => import('@/modules/base/settings/views/index'),
    meta: {
      title: '系统设置',
      i18n: 'menu.uc:settings',
      icon: 'solar:settings-outline',
      hidden: true,
      breadcrumb: [uc, { name: 'uc:settings', path: '/uc/settings', title: '系统设置', i18n: 'menu.uc:settings' }],
    },
  },
]
