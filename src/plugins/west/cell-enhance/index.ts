import type { MinePlugin } from '@/provider/plugins'
import { CELL_ENHANCE_RENDERER, cellEnhanceConfig } from './config'
import { registerCellEnhanceRenderer } from './utils/register-renderers'

export { AvatarInfoCell } from './components/avatar-info-cell'
export { BadgeCell } from './components/badge-cell'
export { ProductInfoCell } from './components/product-info-cell'
export { CELL_ENHANCE_RENDERER } from './config'
export type {
  AvatarInfoCellFields,
  AvatarInfoCellOptions,
  AvatarInfoCellProps,
  AvatarInfoCellText,
  BadgeCellOption,
  BadgeCellOptions,
  BadgeCellProps,
  BadgeCellValue,
  CellEnhanceConfig,
  CellEnhanceRenderTo,
  ProductInfoCellFields,
  ProductInfoCellImageSize,
  ProductInfoCellOptions,
  ProductInfoCellProps,
  ProductInfoCellText,
} from './types'

const plugin: MinePlugin = {
  name: CELL_ENHANCE_RENDERER,
  config: cellEnhanceConfig,
  install: registerCellEnhanceRenderer,
}

export default plugin
