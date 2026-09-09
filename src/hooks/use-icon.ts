import { getIcon, loadIcons, type IconifyIcon } from '@iconify/react'
import { useEffect, useState } from 'react'
import { customIconUrls, normalizeIconName } from '@/lib/icons'

type IconState =
  | { status: 'empty' | 'loading' | 'error' }
  | { status: 'ready'; data: IconifyIcon }
  | { status: 'ready'; src: string }

export function useIcon(value: string): IconState {
  const name = normalizeIconName(value)
  const src = Object.hasOwn(customIconUrls, name) ? customIconUrls[name] : undefined
  const [result, setResult] = useState<{ name: string; state: IconState } | null>(null)

  useEffect(() => {
    if (!name || (!src && (!name.includes(':') || getIcon(name)))) return

    let active = true
    const update = (state: IconState) => {
      if (active) setResult({ name, state })
    }
    const timeout = window.setTimeout(() => update({ status: 'error' }), 12_000)
    let unsubscribe: (() => void) | undefined
    let image: HTMLImageElement | undefined

    if (src) {
      image = new Image()
      image.onload = () => {
        window.clearTimeout(timeout)
        update({ status: 'ready', src })
      }
      image.onerror = () => {
        window.clearTimeout(timeout)
        update({ status: 'error' })
      }
      image.src = src
    } else {
      unsubscribe = loadIcons([name], (_loaded, _missing, pending) => {
        if (pending.length) return
        window.clearTimeout(timeout)
        const data = getIcon(name)
        update(data ? { status: 'ready', data } : { status: 'error' })
      })
    }

    return () => {
      active = false
      window.clearTimeout(timeout)
      unsubscribe?.()
      if (image) {
        image.onload = null
        image.onerror = null
      }
    }
  }, [name, src])

  if (!name) return { status: 'empty' }
  const cached = !src && name.includes(':') ? getIcon(name) : undefined
  if (cached) return { status: 'ready', data: cached }
  if (result?.name === name) return result.state
  if (!src && (!name.includes(':') || cached === null)) return { status: 'error' }
  return { status: 'loading' }
}
