import Classic from './classic'
import Mixed, { MixedHeaderNavigation } from './mixed'
import Verve from './verve'
import { createLayoutRegistry } from './registry'

export function createBuiltinLayouts() {
  const layoutRegistry = createLayoutRegistry({
    id: 'classic',
    label: '经典布局',
    labelKey: '经典布局',
    navigation: Classic,
    order: 0,
  })
  layoutRegistry.register({
    id: 'columns',
    label: '分栏导航',
    labelKey: '分栏导航',
    navigation: Verve,
    shell: 'inset',
    order: 1,
  })
  layoutRegistry.register({
    id: 'mixed',
    label: '混合导航',
    labelKey: '混合导航',
    navigation: Mixed,
    headerNavigation: MixedHeaderNavigation,
    enabled: false,
    order: 2,
  })

  return layoutRegistry
}
