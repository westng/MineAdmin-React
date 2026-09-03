import { useMemo } from 'react'

interface IframeViewProps {
  src: string
  title?: string
}

export default function IframeView({ src, title = '外部页面' }: IframeViewProps) {
  const safeSource = useMemo(() => {
    try {
      const url = new URL(src, window.location.origin)
      if (!['http:', 'https:'].includes(url.protocol)) return null
      return url.toString()
    }
    catch {
      return null
    }
  }, [src])

  if (!safeSource) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">外部页面地址无效。</div>
  }

  return <iframe className="h-[calc(100vh-9rem)] min-h-[32rem] w-full rounded-md border bg-background" src={safeSource} title={title} loading="lazy" referrerPolicy="no-referrer" />
}
