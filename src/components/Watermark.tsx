import { useEffect } from 'react'

export default function Watermark({ text }: { text: string | string[] }) {
  const content = Array.isArray(text) ? text.join(' · ') : text

  useEffect(() => {
    document.documentElement.style.setProperty('--mine-watermark-text', JSON.stringify(content))
    return () => {
      document.documentElement.style.removeProperty('--mine-watermark-text')
    }
  }, [content])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid grid-cols-4 content-center gap-x-20 gap-y-24 overflow-hidden px-8 text-center text-sm font-medium text-foreground/70 opacity-25" aria-hidden="true">
      {Array.from({ length: 32 }, (watermarkSlot, index) => <span key={`${index}-${String(watermarkSlot)}`} className="-rotate-12 whitespace-nowrap">{content}</span>)}
    </div>
  )
}
