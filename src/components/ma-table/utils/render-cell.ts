import type { MaTableCellContext, MaTableCellRenderer, MaTableModel } from '../types'

export function renderTableCell<T extends MaTableModel>(
  context: MaTableCellContext<T>,
  renderers: ReadonlyMap<string, MaTableCellRenderer>,
) {
  const { column, row, rowIndex, value } = context
  if (column.cellRender) return column.cellRender(context)

  const config = column.cellRenderTo
  const renderer = config ? renderers.get(config.name) : undefined
  if (config && renderer) {
    const props = typeof config.props === 'function' ? config.props(context) : config.props
    return renderer.render(context, props)
  }

  if (column.formatter) return column.formatter(row, column, value, rowIndex)
  return value == null || value === '' ? '-' : String(value)
}
