import { useTranslate } from '@/hooks/i18n/use-translator'
import { useSettingStore } from '@/store/settings/use-settings'
import { cn } from '@/utils/cn'

/** 与入口 HTML 共用纯 CSS 三点加载样式，运行时沿用当前主题和语言。 */
export function PageLoading({ fullScreen = false, label }: { fullScreen?: boolean; label?: string }) {
  const t = useTranslate()
  const title = useSettingStore(state => state.title)
  const message = label ?? t('router.loading')

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 p-6 text-center',
        fullScreen ? 'min-h-svh bg-background' : 'min-h-64',
      )}
    >
      <div aria-hidden="true" className="app-loading-dots">
        <span />
        <span />
        <span />
      </div>
      <div className="max-w-full">
        {fullScreen && (
          <h1 className="mb-1.5 text-base font-medium tracking-wide wrap-anywhere text-foreground">
            {title || 'MineAdmin'}
          </h1>
        )}
        <p className="text-xs leading-5 text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
