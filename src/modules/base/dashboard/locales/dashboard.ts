/** 静态路由（首页、个人中心）的菜单标题。 */
export const dashboardLocaleMessages = {
  zh_CN: {
    'menu.dashboard': '仪表盘',
    'menu.uc:index': '个人中心',
    'menu.uc:account': '账号设置',
    'menu.uc:settings': '系统设置',
  },
  zh_TW: {
    'menu.dashboard': '儀表板',
    'menu.uc:index': '個人中心',
    'menu.uc:account': '帳號設定',
    'menu.uc:settings': '系統設定',
  },
  en_US: {
    'menu.dashboard': 'Dashboard',
    'menu.uc:index': 'Profile',
    'menu.uc:account': 'Account',
    'menu.uc:settings': 'Settings',
  },
} as const

export default { namespace: 'app', messages: dashboardLocaleMessages }
