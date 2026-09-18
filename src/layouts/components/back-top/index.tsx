import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/reui/primitives/button'

const tx = createTextTranslator('shell.ui')

export default function BackTop() {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('.mine-main')
    if (!main) return
    const onScroll = () => setVisible(main.scrollTop > 200)
    main.addEventListener('scroll', onScroll)
    onScroll()
    return () => main.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null
  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-6 right-6 z-30 rounded-full bg-background/90 shadow-sm"
      aria-label={tx('返回顶部')}
      onClick={() => document.querySelector<HTMLElement>('.mine-main')?.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <ArrowUp className="size-4" aria-hidden="true" />
    </Button>
  )
}
