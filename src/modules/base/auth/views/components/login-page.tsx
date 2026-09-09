import { useCallback, useEffect, useRef, useState } from 'react'
import { BriefcaseBusiness } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoginForm, type LoginFormValues } from './login-form'
import { useUserStore } from '@/store/modules/useUserStore'
import { exchangeLoginTicket, type FeishuLoginResult } from '@/modules/feishu/login/api/login'
import { useToast } from '@/components/common/use-toast'

function BrandMark() {
  return (
    <div className="flex items-center gap-2 text-base font-medium text-foreground">
      <span className="grid size-6 place-items-center rounded-md bg-foreground text-background">
        <BriefcaseBusiness className="size-4" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span>Rally聚势云</span>
    </div>
  )
}

function BrandContent() {
  return (
    <div className="absolute inset-x-10 bottom-9 z-10 text-foreground">
      <div className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight xl:text-4xl">让每一场营销 都按计划发生</p>
        <p className="pt-5 text-sm font-medium xl:text-base">每日博士旗下，“Rally聚势｜云跨平台营销活动排期与结果复盘平台”</p>
      </div>

      <div className="mt-16 space-y-2 text-xs text-muted-foreground xl:mt-20">
        <p>English&nbsp;&nbsp;简体中文&nbsp;&nbsp;繁體中文</p>
        <p className="whitespace-nowrap leading-5 tracking-tight">浙ICP备2026026026号-1&nbsp;&nbsp;Copyright © 2024 - 2026 Rally聚势云&nbsp;&nbsp;杭州建煜电子商务有限公司, All Rights Reserved.</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useUserStore(state => state.login)
  const loginWithTokens = useUserStore(state => state.loginWithTokens)
  const { toast } = useToast()
  const [feishuLoading, setFeishuLoading] = useState(false)
  const handledTicket = useRef<string | null>(null)

  const applyFeishuResult = useCallback(async (result: FeishuLoginResult) => {
    setFeishuLoading(true)
    try {
      if (result.result_code === 'FEISHU_LOGIN_SUCCESS' && result.tokens) {
        await loginWithTokens(result.tokens)
        const redirect = new URLSearchParams(location.search).get('redirect') || '/dashboard'
        navigate(redirect, { replace: true })
      }
      else {
        toast(feishuResultMessage(result.result_code), result.result_code === 'FEISHU_LOGIN_PENDING' ? 'info' : 'destructive')
      }
    }
    catch {
      toast('飞书登录结果处理失败，请重新发起登录', 'destructive')
    }
    finally {
      setFeishuLoading(false)
    }
  }, [location.search, loginWithTokens, navigate, toast])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const ticket = params.get('feishu_ticket')
    if (!ticket || handledTicket.current === ticket) return

    handledTicket.current = ticket
    params.delete('feishu_ticket')
    navigate({ pathname: '/login', search: params.toString() }, { replace: true })
    setFeishuLoading(true)
    if (window.opener && window.opener !== window) {
      window.opener.postMessage({ type: 'rally-feishu-login-ticket', ticket }, window.location.origin)
      return
    }
    void exchangeLoginTicket(ticket).then(response => applyFeishuResult(response.data.data)).catch(() => {
      toast('飞书登录结果已失效，请重新发起登录', 'destructive')
    }).finally(() => {
      setFeishuLoading(false)
    })
  }, [applyFeishuResult, location.search, navigate, toast])

  const handleLogin = useCallback(async (values: LoginFormValues) => {
    await login(values)
    const redirect = new URLSearchParams(location.search).get('redirect') || '/dashboard'
    navigate(redirect, { replace: true })
  }, [location.search, login, navigate])

  return (
    <main className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="relative hidden w-1/2 bg-muted lg:block lg:w-[70%]" aria-label="品牌展示区域">
          <video
            className="absolute inset-0 size-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
          >
            <source src="/b1eb435b89a05e8b.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-background/30" aria-hidden="true" />
          <div className="absolute left-10 top-9 z-10">
            <BrandMark />
          </div>
          <BrandContent />
        </aside>
        <section className="relative flex min-h-screen w-full items-center justify-center bg-background px-6 py-20 lg:w-[30%] lg:px-10">
          <div className="absolute left-6 top-8 lg:hidden">
            <BrandMark />
          </div>

          <div className="w-full max-w-[320px] translate-y-6">
            <div className="mb-7 space-y-2 text-left">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">👋 · 登录您的账户</h1>
              <p className="text-sm leading-6 text-muted-foreground">让每一次登录，都成为营销按计划发生的起点。</p>
            </div>

            {feishuLoading && <p className="mb-3 text-sm text-muted-foreground" role="status">正在确认飞书登录…</p>}
            <LoginForm onSubmit={handleLogin} onFeishuResult={applyFeishuResult} />
          </div>
        </section>
      </div>
    </main>
  )
}

function feishuResultMessage(resultCode: string): string {
  switch (resultCode) {
    case 'FEISHU_LOGIN_PENDING':
      return '账号已创建，请等待管理员启用后再登录'
    case 'FEISHU_LOGIN_NO_PERMISSION':
      return '账号已启用，请联系管理员分配系统权限'
    case 'FEISHU_LOGIN_BINDING_REQUIRED':
      return '飞书账号缺少手机号，请联系管理员完成身份绑定'
    case 'FEISHU_LOGIN_IDENTITY_CONFLICT':
      return '飞书身份与系统账号存在冲突，请联系管理员处理'
    case 'FEISHU_LOGIN_IDENTITY_REVOKED':
      return '飞书身份已被停用，请联系管理员处理'
    case 'FEISHU_LOGIN_CANCELLED':
      return '已取消飞书授权'
    case 'FEISHU_LOGIN_STATE_INVALID':
      return '登录链接已失效，请重新发起飞书登录'
    case 'FEISHU_LOGIN_CONNECTION_DISABLED':
      return '当前飞书主体暂不可用，请选择其他主体'
    default:
      return '飞书服务暂时不可用，请稍后重试'
  }
}
