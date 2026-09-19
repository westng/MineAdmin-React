import { createTextTranslator } from '@/provider/i18n'
import Classic from './classic'
import Columns from './columns'
import Mixed, { MixedHeaderNavigation } from './mixed'
import Verve from './verve'
import { createLayoutRegistry } from './registry'

const tx = createTextTranslator('shell.ui')
export const layoutRegistry = createLayoutRegistry({
  id: 'classic',
  get label() {
    return tx('经典侧栏')
  },
  navigation: Classic,
  order: 0,
})
layoutRegistry.register({
  id: 'columns',
  get label() {
    return tx('分栏导航')
  },
  navigation: Columns,
  order: 1,
})
layoutRegistry.register({
  id: 'mixed',
  get label() {
    return tx('混合导航')
  },
  navigation: Mixed,
  headerNavigation: MixedHeaderNavigation,
  order: 2,
})
layoutRegistry.register({
  id: 'verve',
  get label() {
    return tx('CRM 工作台')
  },
  navigation: Verve,
  shell: 'inset',
  order: 3,
})
