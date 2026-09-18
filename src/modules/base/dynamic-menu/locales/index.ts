export const dynamicMenuLocaleMessages = {
  zh_CN: {
    'menu.pageError': '页面不存在',
  },
  en_US: {
    'menu.pageError': 'Page not found',
  },
} as const

export default { namespace: 'app', messages: dynamicMenuLocaleMessages }
