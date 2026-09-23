import { useCallback, useEffect, useState } from 'react'
import { BriefcaseBusiness } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@/hooks/framework/use-session'
import { useTranslate } from '@/provider/i18n'
import { cn } from '@/utils/cn'
import { getWebsiteLoginConfig } from '../api/website'
import { getLoginPageConfig, normalizeWebsiteLoginConfig, type WebsiteLoginConfig } from './data/website'
import { LoginForm, type LoginFormValues } from './components/login-form'

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
    <div className="absolute bottom-5 left-10 z-10 w-[85%] text-black">
      <div className="flex flex-col gap-3 text-[40px] font-bold leading-normal">
        {config.headline && <p>{config.headline}</p>}
        {config.subheadline && <p>{config.subheadline}</p>}
      </div>
      {config.description && <p className="mt-8 whitespace-pre-line text-base">{config.description}</p>}

      <div className="mt-[90px] text-xs">
        {config.language_labels.length > 0 && (
          <p className="mb-1 flex flex-wrap gap-x-2">
            {config.language_labels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {config.icp_number && (
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:underline"
            >
              {config.icp_number}
            </a>
          )}
          {config.copyright_text && (
            <>
              <span>Copyright</span>
              <span>©</span>
              <span>{config.copyright_text}</span>
            </>
          )}
          {config.company_text && <span>{config.company_text}</span>}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { branding: brandingDefaults, subtitle, usernameType, showAccountLinks } = getLoginPageConfig()
  const navigate = useNavigate()
  const { search } = useLocation()
  const login = useSession(state => state.login)
  const t = useTranslate()
  const [branding, setBranding] = useState(brandingDefaults)
  const hasBranding = Boolean(
    branding.video_url || branding.logo_url || branding.headline || branding.subheadline || branding.description,
  )

  useEffect(() => {
    const controller = new AbortController()
    void getWebsiteLoginConfig(controller.signal)
      .then(response => {
        if (!controller.signal.aborted) setBranding(normalizeWebsiteLoginConfig(response.data.data, brandingDefaults))
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [brandingDefaults])

  const handleLogin = useCallback(
    async (values: LoginFormValues) => {
      await login(values)
      const target = new URLSearchParams(search).get('redirect') || '/dashboard'
      navigate(target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard', { replace: true })
    },
    [search, login, navigate],
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        {hasBranding && (
          <aside className="relative hidden w-1/2 bg-muted lg:block lg:w-[70%]" aria-label="品牌展示区域">
            <video
              className="absolute inset-0 size-full object-cover"
              src={branding.video_url || undefined}
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
              onError={event => {
                if (
                  brandingDefaults.video_url &&
                  event.currentTarget.getAttribute('src') !== brandingDefaults.video_url
                ) {
                  event.currentTarget.src = brandingDefaults.video_url
                }
              }}
            />
            <div className="absolute left-10 top-9 z-10 text-white">
              <img
                src={branding.logo_url || undefined}
                alt={branding.site_name}
                className="h-10 w-auto"
                onError={event => {
                  if (
                    brandingDefaults.logo_url &&
                    event.currentTarget.getAttribute('src') !== brandingDefaults.logo_url
                  ) {
                    event.currentTarget.src = brandingDefaults.logo_url
                  }
                }}
              />
            </div>
            <BrandContent config={branding} />
          </aside>
        )}
        <section
          className={cn(
            'relative flex min-h-screen w-full items-center justify-center bg-background px-6 py-20',
            hasBranding && 'lg:w-[30%] lg:px-10',
          )}
        >
          <div className={cn('absolute left-6 top-8 text-foreground', hasBranding && 'lg:hidden')}>
            <BrandMark siteName={branding.site_name} />
          </div>

          <div className="w-full max-w-[320px] translate-y-6">
            <div className="mb-7 space-y-2 text-left">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">👋 · {t('auth.welcome')}</h1>
              {subtitle && <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>}
            </div>

            <LoginForm onSubmit={handleLogin} usernameType={usernameType} showAccountLinks={showAccountLinks} />
          </div>
        </section>
      </div>
    </main>
  )
}
