import { Navigate, Outlet } from 'react-router-dom'
import type { AppRoute } from '@/router/types'
import ErrorPage from '@/router/pages/not-found'
import DynamicMenuPage from '@/modules/base/dynamic-menu/views'
import dashboardRoute from './dashboardRoute'
import ucChildren from './ucChildren'

import { lazyView } from '@/router/lazy-view'

const AppLayout = lazyView(() => import('@/layouts'))
const ClinicSectionPage = lazyView(() => import('@/modules/base/clinic/views'))
const LoginPage = lazyView(() => import('@/modules/base/auth/views'))
const UserCenterPage = lazyView(() => import('@/modules/base/user-center/views'))
const AccountSettingsPage = lazyView(() => import('@/modules/base/account-settings/views'))

const rootRoutes: AppRoute[] = [
  {
    name: 'MineRootLayoutRoute',
    path: '/',
    element: <AppLayout />,
    children: [
      {
        name: 'root:index',
        path: '',
        element: <Navigate to="dashboard" replace />,
      },
      dashboardRoute,
      {
        name: 'calendar',
        path: 'calendar',
        element: <ClinicSectionPage section="calendar" />,
        meta: { title: 'Calendar' },
      },
      {
        name: 'appointments',
        path: 'appointments',
        element: <ClinicSectionPage section="appointments" />,
        meta: { title: 'Appointments' },
      },
      {
        name: 'customers',
        path: 'customers',
        element: <ClinicSectionPage section="customers" />,
        meta: { title: 'Customers' },
      },
      {
        name: 'staff',
        path: 'staff',
        element: <ClinicSectionPage section="staff" />,
        meta: { title: 'Staff' },
      },
      {
        name: 'payments',
        path: 'payments',
        element: <ClinicSectionPage section="payments" />,
        meta: { title: 'Payments' },
      },
      {
        name: 'settings',
        path: 'settings',
        element: <UserCenterPage />,
        meta: { title: '设置' },
      },
      {
        name: 'settings-account',
        path: 'settings/account',
        element: <AccountSettingsPage />,
        meta: { title: '账号设置' },
      },
      {
        name: 'uc',
        path: 'uc',
        element: <Outlet />,
        children: ucChildren,
      },
      {
        name: 'dynamic-menu-fallback',
        path: '*',
        element: <DynamicMenuPage />,
        meta: { hidden: true },
      },
    ],
  },
  {
    name: 'login',
    path: '/login',
    element: <LoginPage />,
    meta: { title: '登录', i18n: 'menu.login', useDefaultLayout: false },
  },
  {
    name: 'MineSystemError',
    path: '*',
    element: <ErrorPage />,
    meta: { hidden: true, i18n: 'menu.pageError', useDefaultLayout: false },
  },
]

export default rootRoutes
