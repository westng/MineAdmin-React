import { Navigate, Outlet } from 'react-router-dom'
import type { AppRoute } from '@/router/types'
import AppLayout from '@/layouts'
import ClinicSectionPage from '@/modules/base/views/clinic'
import LoginPage from '@/modules/base/views/login'
import ErrorPage from '@/layouts/[...all]'
import DynamicMenuPage from '@/modules/base/views/dynamic-menu'
import UserCenterPage from '@/modules/base/views/user-center'
import AccountSettingsPage from '@/modules/base/views/account-settings'
import dashboardRoute from './dashboardRoute'
import ucChildren from './ucChildren'

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
