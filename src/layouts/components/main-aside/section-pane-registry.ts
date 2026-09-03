import type { ComponentType } from 'react'

export type SectionPaneConfig = {
  section: string
  component: ComponentType
}

export const customSectionPanes: SectionPaneConfig[] = []

export function registerSectionPane(config: SectionPaneConfig) {
  customSectionPanes.push(config)
}
