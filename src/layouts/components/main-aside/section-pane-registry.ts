import type { ComponentType } from 'react'
export type SectionPaneConfig = { section: string; path?: string; component: ComponentType }
/** @deprecated Legacy application registrations; migrate to PluginContext.registerSlot(shell.pane). */
export const customSectionPanes: SectionPaneConfig[] = []
export function registerSectionPane(config: SectionPaneConfig) {
  const exists = customSectionPanes.some(
    pane => pane.section === config.section && pane.path === config.path && pane.component === config.component,
  )
  if (exists) return () => undefined
  customSectionPanes.push(config)
  return () => {
    const index = customSectionPanes.indexOf(config)
    if (index >= 0) customSectionPanes.splice(index, 1)
  }
}
