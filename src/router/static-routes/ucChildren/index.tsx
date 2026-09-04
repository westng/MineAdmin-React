import type { AppRoute } from '@/router/types'
import { Navigate } from 'react-router-dom'
import SettingsPage from '@/modules/base/settings/views'

const ucChildren: AppRoute[] = [
  {
    name: 'uc:index',
    path: 'index',
    element: <Navigate to="/settings" replace />,
    meta: {
      title: '个人资料',
      icon: 'heroicons:user-circle',
      i18n: 'menu.uc:index',
    },
  },
  {
    name: 'uc:settings',
    path: 'settings',
    element: <SettingsPage />,
    meta: {
      title: '系统设置',
      icon: 'solar:settings-outline',
      i18n: 'menu.uc:settings',
    },
  },
]

export default ucChildren
