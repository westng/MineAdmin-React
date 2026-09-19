import { createTextTranslator } from '@/provider/i18n'
import Classic from './classic'
import Mixed, { MixedHeaderNavigation } from './mixed'
import Verve from './verve'
import { createLayoutRegistry } from './registry'

const tx = createTextTranslator('shell.ui')
export const layoutRegistry = createLayoutRegistry({
  id: 'classic',
  get label() {
    return tx('经典布局')
  },
  navigation: Classic,
  order: 0,
})
layoutRegistry.register({
  id: 'columns',
  aliases: ['verve'],
  get label() {
    return tx('分栏导航')
  },
  navigation: Verve,
  shell: 'inset',
  order: 1,
})
layoutRegistry.register({
  id: 'mixed',
  get label() {
    return tx('混合导航')
  },
  navigation: Mixed,
  headerNavigation: MixedHeaderNavigation,
  enabled: false,
  order: 2,
})
