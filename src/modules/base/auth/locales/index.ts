export const authLocaleMessages = {
  zh_CN: {
    'menu.login': '登录',
    'auth.welcome': '登录您的账户',
    'auth.email': '电子邮件',
    'auth.forgotPassword': '忘记密码了吗？',
    'auth.noAccount': '还没有账号？',
    'auth.register': '立即注册',
  },
  en_US: {
    'menu.login': 'Login',
    'auth.welcome': 'Sign in to your account',
    'auth.email': 'Email',
    'auth.forgotPassword': 'Forgot password?',
    'auth.noAccount': 'No account yet?',
    'auth.register': 'Register now',
  },
} as const

export default { namespace: 'app', messages: authLocaleMessages }
