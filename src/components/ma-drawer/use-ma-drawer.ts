import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { MaDrawerController, MaDrawerProps, MaDrawerStaticProps, UseMaDrawerOptions } from './types'

export function useMaDrawer<TArgs extends unknown[] = unknown[]>(
  options: UseMaDrawerOptions = {},
): MaDrawerController<TArgs> {
  const [isOpen, setIsOpen] = useState(false)
  const [args, setArgs] = useState<TArgs>([] as unknown as TArgs)
  const [attributes, setAttributesState] = useState<MaDrawerStaticProps>(options)

  const open = useCallback((...nextArgs: TArgs) => {
    setArgs(nextArgs)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => setIsOpen(false), [])
  const setTitle = useCallback((nextTitle: ReactNode) => {
    setAttributesState(current => ({ ...current, title: nextTitle }))
  }, [])
  const setAttributes = useCallback((nextAttributes: Partial<MaDrawerStaticProps>) => {
    setAttributesState(current => ({ ...current, ...nextAttributes }))
  }, [])
  const props = useMemo<MaDrawerProps>(
    () => ({
      ...attributes,
      open: isOpen,
      onOpenChange: setIsOpen,
    }),
    [attributes, isOpen],
  )

  return { isOpen, args, props, open, close, setTitle, setAttr: setAttributes, setAttributes }
}
