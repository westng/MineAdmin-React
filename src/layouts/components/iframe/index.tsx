import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { resolveIframeSource } from '@/services/navigation/iframe-policy'
import { getIframePolicy } from './policy'

const tx = createTextTranslator('shell.ui')
interface IframeViewProps {
  src: string
  title?: string
}
export default function IframeView({ src, title = tx('外部页面') }: IframeViewProps) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const policy = getIframePolicy()
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
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      sandbox={policy.sandbox}
    />
  )
}
