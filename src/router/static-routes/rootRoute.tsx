import { Navigate, Outlet } from 'react-router-dom'
import type { AppRoute } from '@/router/types'
import AppLayout from '@/layouts'
import ClinicSectionPage from '@/modules/base/clinic/views'
import LoginPage from '@/modules/base/auth/views'
import FeishuCallbackPage from '@/modules/feishu/login/components/FeishuCallbackPage'
import ErrorPage from '@/layouts/[...all]'
import DynamicMenuPage from '@/modules/base/dynamic-menu/views'
import dashboardRoute from './dashboardRoute'
import ucChildren from './ucChildren'

import { lazyView } from '@/router/lazy-view'

const InboxPage = lazyView(() => import('@/modules/notification/views'))
const NotificationDetailPage = lazyView(() => import('@/modules/notification/views/detail'))
const AnnouncementPage = lazyView(() => import('@/modules/notification/views/announcements'))
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
      { name: 'notifications', path: 'notifications', element: <InboxPage />, meta: { title: '通知中心' } },
      { name: 'notification-announcements', path: 'settings/announcements', element: <AnnouncementPage />, meta: { title: '公告管理' } },
      { name: 'notification-detail', path: 'notifications/:id', element: <NotificationDetailPage />, meta: { title: '通知详情', hidden: true } },
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
  {
    name: 'feishu-callback',
    path: '/login/feishu/callback',
    element: <FeishuCallbackPage />,
    meta: { title: '飞书授权', hidden: true, useDefaultLayout: false },
  },
]

export default rootRoutes
