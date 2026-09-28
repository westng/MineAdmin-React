import { createContext, useContext } from 'react'
/** UI portals inherit the owning application's theme and DOM scope. */
export const PortalContainerContext = createContext<HTMLElement | null>(null)
export function usePortalContainer() {
  return useContext(PortalContainerContext) ?? undefined
}
