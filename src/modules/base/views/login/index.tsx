import { useCallback } from 'react'
import { BriefcaseBusiness } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoginForm, type LoginFormValues } from '@/modules/base/views/login/components/login-form'
import { useUserStore } from '@/store/modules/useUserStore'

function BrandMark() {
  return (
    <div className="flex items-center gap-2 text-base font-medium text-foreground">
      <span className="grid size-6 place-items-center rounded-md bg-foreground text-background">
        <BriefcaseBusiness className="size-4" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span>MineAdmin</span>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useUserStore(state => state.login)
  const handleLogin = useCallback(async (values: LoginFormValues) => {
    await login(values)
    const redirect = new URLSearchParams(location.search).get('redirect') || '/dashboard'
    navigate(redirect, { replace: true })
  }, [location.search, login, navigate])

  return (
    <main className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="relative hidden w-1/2 bg-muted lg:block" aria-label="品牌展示区域">
          <div className="absolute left-10 top-9">
            <BrandMark />
          </div>
        </aside>
        <section className="relative flex min-h-screen w-full items-center justify-center bg-background px-6 py-20 lg:w-1/2 lg:px-10">
          <div className="absolute left-6 top-8 lg:hidden">
            <BrandMark />
          </div>

          <div className="w-full max-w-[320px] translate-y-6">
            <div className="mb-7 space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">登录您的账户</h1>
              <p className="text-sm leading-6 text-muted-foreground">请在下方输入您的用户名和密码以登录您的账户</p>
            </div>

            <LoginForm onSubmit={handleLogin} />
          </div>
        </section>
      </div>
    </main>
  )
}
