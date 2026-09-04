import type { ComponentType } from 'react'

export type SectionPaneConfig = {
  section: string
  path?: string
  component: ComponentType
}

export const customSectionPanes: SectionPaneConfig[] = []

export function registerSectionPane(config: SectionPaneConfig) {
  const exists = customSectionPanes.some(pane => pane.section === config.section && pane.path === config.path && pane.component === config.component)
  if (exists) return
  customSectionPanes.push(config)
}
