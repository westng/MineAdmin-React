import { registerTableCellRenderer } from '@/components/ma-table/utils/cell-renderers'
import { CELL_ENHANCE_RENDERER } from '../config'
import { renderCellEnhance } from './render-cell-enhance'

export function registerCellEnhanceRenderer() {
  return registerTableCellRenderer({
    name: CELL_ENHANCE_RENDERER,
    render: renderCellEnhance,
  })
}
