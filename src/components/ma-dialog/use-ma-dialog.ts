import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { MaDialogController, MaDialogProps, MaDialogStaticProps, UseMaDialogOptions } from './types'

export function useMaDialog<TArgs extends unknown[] = unknown[]>(
  options: UseMaDialogOptions = {},
): MaDialogController<TArgs> {
  const [isOpen, setIsOpen] = useState(false)
  const [args, setArgs] = useState<TArgs>([] as unknown as TArgs)
  const [attributes, setAttributesState] = useState<MaDialogStaticProps>(options)

  const open = useCallback((...nextArgs: TArgs) => {
    setArgs(nextArgs)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => setIsOpen(false), [])
  const setTitle = useCallback((nextTitle: ReactNode) => {
    setAttributesState(current => ({ ...current, title: nextTitle }))
  }, [])
  const setAttributes = useCallback((nextAttributes: Partial<MaDialogStaticProps>) => {
    setAttributesState(current => ({ ...current, ...nextAttributes }))
  }, [])
  const props = useMemo<MaDialogProps>(
    () => ({
      ...attributes,
      open: isOpen,
      onOpenChange: setIsOpen,
    }),
    [attributes, isOpen],
  )

  return { isOpen, args, props, open, close, setTitle, setAttr: setAttributes, setAttributes }
}
