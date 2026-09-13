import type { MinePluginConfig } from '@/provider/plugins'

export const CELL_ENHANCE_RENDERER = 'west/cell-enhance'

export const cellEnhanceConfig: MinePluginConfig = {
  enable: true,
  info: {
    name: CELL_ENHANCE_RENDERER,
    version: '0.1.0',
    author: 'west',
    description: 'React 表格单元格增强组件',
  },
}
