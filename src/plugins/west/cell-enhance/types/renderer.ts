import type { MaTableCellRenderTo, MaTableModel } from '@/components/ma-table/types'
import type { AvatarInfoCellOptions } from './avatar-info'
import type { BadgeCellOptions } from './badge'

export type CellEnhanceConfig = {
  type: 'badge'
  props?: BadgeCellOptions
} | {
  type: 'avatar-info'
  props?: AvatarInfoCellOptions
}

/** 可用于 satisfies，校验渲染器名称与各类单元格参数。 */
export type CellEnhanceRenderTo<T extends MaTableModel = MaTableModel> =
  MaTableCellRenderTo<T, CellEnhanceConfig> & { name: 'west/cell-enhance' }
