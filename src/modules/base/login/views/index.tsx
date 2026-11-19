import { BriefcaseBusiness } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createWebsiteApi } from '@/modules/base/login/api/website'
import { useSession } from '@/hooks/auth/use-session'
import { useSettingStore } from '@/store/settings/use-settings'
import { useTranslate } from '@/hooks/i18n/use-translator'
import { cn } from '@/utils/cn'

import { normalizeWebsiteLoginConfig, type WebsiteLoginConfig } from './data/website'
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

function BrandContent({ config, hasVideoBackground }: { config: WebsiteLoginConfig; hasVideoBackground: boolean }) {
  return (
    <div
      className={cn('pointer-events-none relative z-10 min-w-0', hasVideoBackground ? 'text-black' : 'text-foreground')}
    >
      <div className="flex flex-col gap-3 text-[40px] font-bold leading-normal">
        {config.headline && <p>{config.headline}</p>}
        {config.subheadline && <p>{config.subheadline}</p>}
      </div>
      {config.description && <p className="mt-8 whitespace-pre-line text-base">{config.description}</p>}

      <div className="mt-10 text-xs">
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
              className="pointer-events-auto underline-offset-4 hover:underline"
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
  const { getWebsiteLoginConfig } = useRuntimeFactory(createWebsiteApi)

  const {
    branding: brandingDefaults,
    renderBranding: renderBackground,
    subtitle,
    usernameType,
    showAccountLinks,
    passwordLoginMode,
  } = useRuntime().loginPage.getSnapshot()
  const navigate = useNavigate()
  const dashboardPath = useSettingStore(state => state.settings.dashboardPage.path)
  const { search } = useLocation()
  const login = useSession(state => state.login)
  const t = useTranslate()
  const [branding, setBranding] = useState(brandingDefaults)
  const hasVideoBackground = !renderBackground && Boolean(branding.video_url)
  const hasBranding = Boolean(
    renderBackground ||
    branding.video_url ||
    branding.logo_url ||
    branding.headline ||
    branding.subheadline ||
    branding.description,
  )

  useEffect(() => {
    const controller = new AbortController()
    void getWebsiteLoginConfig({}, controller.signal)
      .then(response => {
        if (!controller.signal.aborted) setBranding(normalizeWebsiteLoginConfig(response.data.data, brandingDefaults))
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [brandingDefaults, getWebsiteLoginConfig])

  const handleLogin = useCallback(
    async (values: LoginFormValues) => {
      await login(values)
      const target = new URLSearchParams(search).get('redirect') || dashboardPath
      navigate(target.startsWith('/') && !target.startsWith('//') ? target : dashboardPath, { replace: true })
    },
    [search, login, navigate, dashboardPath],
  )

  return (
    <main
      className={cn(
        'page-grid min-h-svh gap-0 bg-background',
        hasBranding && 'lg:grid-cols-[repeat(8,calc(70%/8))_repeat(4,calc(30%/4))]',
      )}
    >
      {hasBranding && (
        <aside
          className="relative isolate hidden flex-col justify-between gap-12 overflow-hidden bg-muted p-(--page-grid-margin) lg:col-span-8 lg:flex"
          aria-label="品牌展示区域"
        >
          <div className="absolute inset-0 z-0">
            {renderBackground ? (
              renderBackground(branding)
            ) : (
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
            )}
          </div>
          <div className="pointer-events-none relative z-10 text-white">
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
          <BrandContent config={branding} hasVideoBackground={hasVideoBackground} />
        </aside>
      )}
      <section
        className={cn(
          'flex min-h-svh flex-col bg-background px-(--page-grid-margin) py-8',
          hasBranding ? 'lg:col-span-4 lg:px-8 xl:px-12' : 'md:col-span-4 md:col-start-3 lg:col-start-5',
        )}
      >
        <div className={cn('text-foreground', hasBranding && 'lg:hidden')}>
          <BrandMark siteName={branding.site_name} />
        </div>

        <div className="flex flex-1 items-center py-12">
          <div className={cn('w-full min-w-0', hasBranding && 'lg:mx-auto lg:max-w-[22rem]')}>
            <div className="mb-7 space-y-2 text-left">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">👋 · {t('auth.welcome')}</h1>
              {subtitle && <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>}
            </div>

            <LoginForm
              onSubmit={handleLogin}
              usernameType={usernameType}
              showAccountLinks={showAccountLinks}
              passwordLoginMode={passwordLoginMode}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
