import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { resolveIframeSource } from '@/services/navigation/iframe-policy'
import { useRuntime } from '@/hooks/runtime/use-runtime'

interface IframeViewProps {
  src: string
  title?: string
}
export default function IframeView({ src, title }: IframeViewProps) {
  const tx = useTextTranslator('shell.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

  const policy = useRuntime().iframe.get()
  const source = resolveIframeSource(src, policy)
  if (!source)
    return (
      <div role="alert" className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
        {tx('此页面来源未被允许。')}
      </div>
    )
  return (
    <iframe
      className="h-[calc(100vh-9rem)] min-h-[32rem] w-full rounded-md border bg-background"
      src={source}
      title={title ?? tx('外部页面')}
      loading="lazy"
      referrerPolicy="no-referrer"
      sandbox={policy.sandbox}
    />
  )
}
