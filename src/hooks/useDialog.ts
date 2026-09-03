import { useCallback, useState } from 'react'

export function useDialog(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen)
  const show = useCallback(() => setOpen(true), [])
  const hide = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(value => !value), [])
  return { open, setOpen, show, hide, toggle }
}

export const useDrawer = useDialog
