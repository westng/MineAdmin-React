import { useCallback, useEffect, useRef, useState } from 'react'
import { BriefcaseBusiness } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoginForm, type LoginFormValues } from './login-form'
import { useUserStore } from '@/store/modules/useUserStore'
import { exchangeLoginTicket, type FeishuLoginResult } from '@/modules/feishu/login/api/login'
import { postFeishuTicketToOpener, isFeishuTicket } from '@/modules/feishu/login/utils/oauth-popup'
import { feishuResultMessage } from '@/modules/feishu/login/utils/result-message'
import { useToast } from '@/components/common/use-toast'
import { getWebsiteLoginConfig } from '../../api/website'
import { defaultWebsiteLoginConfig, normalizeWebsiteLoginConfig, type WebsiteLoginConfig } from '../../data/website'

function BrandMark({ siteName }: { siteName: string }) {
  return (
    <div className="flex items-center gap-2 text-base font-medium">
      <span className="grid size-6 place-items-center rounded-md bg-foreground text-background">
        <BriefcaseBusiness className="size-4" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span>{siteName}</span>
    </div>
  )
}

function BrandContent({ config }: { config: WebsiteLoginConfig }) {
  return (
    <div className="absolute bottom-5 left-10 z-10 w-[85%] text-white">
      <div className="flex flex-col gap-3 text-[40px] font-bold leading-normal">
        {config.headline && <p>{config.headline}</p>}
        {config.subheadline && <p>{config.subheadline}</p>}
      </div>
      {config.description && <p className="mt-8 whitespace-pre-line text-base">{config.description}</p>}

      <div className="mt-[90px] text-xs">
        {config.language_labels.length > 0 && (
          <p className="mb-1 flex flex-wrap gap-x-2">
            {config.language_labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {config.icp_number && <span>{config.icp_number}</span>}
          {config.copyright_text && <><span>Copyright</span><span>©</span><span>{config.copyright_text}</span></>}
          {config.company_text && <span>{config.company_text}</span>}
        </div>
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
  const [branding, setBranding] = useState(defaultWebsiteLoginConfig)
  const [feishuLoading, setFeishuLoading] = useState(false)
  const handledTicket = useRef<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void getWebsiteLoginConfig(controller.signal).then(response => {
      if (!controller.signal.aborted) setBranding(normalizeWebsiteLoginConfig(response.data.data))
    }).catch(() => undefined) // 展示配置不可用时保留默认内容，不阻断登录。
    return () => controller.abort()
  }, [])

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
    if (!isFeishuTicket(ticket) || handledTicket.current === ticket) return

    handledTicket.current = ticket
    params.delete('feishu_ticket')
    navigate({ pathname: '/login', search: params.toString() }, { replace: true })
    setFeishuLoading(true)
    if (postFeishuTicketToOpener(ticket)) {
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
            src={branding.video_url}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            onError={event => {
              if (event.currentTarget.getAttribute('src') !== defaultWebsiteLoginConfig.video_url) {
                event.currentTarget.src = defaultWebsiteLoginConfig.video_url
              }
            }}
          />
          <div className="absolute left-10 top-9 z-10 text-white">
            <img
              src={branding.logo_url}
              alt={branding.site_name}
              className="h-10 w-auto"
              onError={event => {
                if (event.currentTarget.getAttribute('src') !== defaultWebsiteLoginConfig.logo_url) {
                  event.currentTarget.src = defaultWebsiteLoginConfig.logo_url
                }
              }}
            />
          </div>
          <BrandContent config={branding} />
        </aside>
        <section className="relative flex min-h-screen w-full items-center justify-center bg-background px-6 py-20 lg:w-[30%] lg:px-10">
          <div className="absolute left-6 top-8 text-foreground lg:hidden">
            <BrandMark siteName={branding.site_name} />
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
