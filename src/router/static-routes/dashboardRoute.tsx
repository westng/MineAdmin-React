import { Outlet } from 'react-router-dom'
import type { AppRoute } from '@/router/types'
import DashboardPage from '@/modules/base/views/dashboard'

const dashboardRoute: AppRoute = {
  name: 'dashboard',
  path: 'dashboard',
  meta: {
    title: 'Overview',
    i18n: 'menu.dashboard',
    icon: 'mingcute:dashboard-line',
  },
  element: <Outlet />,
  children: [
    {
      name: 'dashboard:index',
      path: '',
      element: <DashboardPage />,
      meta: { hidden: true },
    },
  ],
}

export default dashboardRoute
