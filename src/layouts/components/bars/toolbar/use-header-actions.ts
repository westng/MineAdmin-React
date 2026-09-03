import { useContext, useEffect, type ReactNode } from 'react'
import { HeaderActionsSetterContext } from './header-actions-context'

export function useHeaderActions(actions: ReactNode) {
  const setActions = useContext(HeaderActionsSetterContext)

  useEffect(() => {
    if (!setActions) return
    setActions(actions)
    return () => setActions(null)
  }, [actions, setActions])
}
