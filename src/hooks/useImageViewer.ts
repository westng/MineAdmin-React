import { useState } from 'react'

export function useImageViewer(images: string[] = []) {
  const [active, setActive] = useState<number | null>(null)
  return {
    images,
    active,
    open: (index: number) => setActive(index),
    close: () => setActive(null),
    current: active === null ? null : images[active] || null,
  }
}

export default useImageViewer
