import { useContext, useState, type PropsWithChildren, type ReactNode } from 'react'
import { HeaderActionsContext, HeaderActionsSetterContext } from './header-actions-context'

export function HeaderActionsProvider({ children }: PropsWithChildren) {
  const [actions, setActions] = useState<ReactNode>(null)

  return (
    <HeaderActionsSetterContext.Provider value={setActions}>
      <HeaderActionsContext.Provider value={actions}>
        {children}
      </HeaderActionsContext.Provider>
    </HeaderActionsSetterContext.Provider>
  )
}

export function HeaderActionSlot() {
  return useContext(HeaderActionsContext)
}

export default HeaderActionSlot
