import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableBody, TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getColumnValue, resolveRowClass, resolveRowStyle } from '../utils/table-utils'
import { renderTableCell } from '../utils/render-cell'
import { useTableCellRenderers } from '../hooks/use-table-cell-renderers'
import type { MaTableCellContext, MaTableColumn, MaTableModel, MaTableOptions } from '../types'

export interface MaTableBodyProps<T extends MaTableModel> {
  rows: T[]
  columns: MaTableColumn<T>[]
  options: MaTableOptions<T>
  currentPage: number
  pageSize: number
  loading: boolean
  empty?: React.ReactNode
  selectedKeys: Set<string>
  expandedKeys: Set<string>
  getRowKey: (row: T, index: number) => string
  onSelectionChange: (row: T, checked: boolean, index: number) => void
  onExpandChange: (row: T, index: number) => void
  onRowClick?: (row: T, index: number) => void
}

export function MaTableBody<T extends MaTableModel>({ rows, columns, options, currentPage, pageSize, loading, empty, selectedKeys, expandedKeys, getRowKey, onSelectionChange, onExpandChange, onRowClick }: MaTableBodyProps<T>) {
  const cellRenderers = useTableCellRenderers()
  function handleRowClick(event: React.MouseEvent<HTMLTableRowElement>, row: T, rowIndex: number) {
    const target = event.target as HTMLElement
    if (target.closest('button, input, select, textarea, a, [role="button"], [role="checkbox"]')) return
    onRowClick?.(row, rowIndex)
  }

  function renderCell(column: MaTableColumn<T>, row: T, rowIndex: number): React.ReactNode {
    const value = getColumnValue(row, column)
    const context: MaTableCellContext<T> = { row, rowIndex, column, value }
    if (column.type === 'selection') return <Checkbox checked={selectedKeys.has(getRowKey(row, rowIndex))} onCheckedChange={checked => onSelectionChange(row, checked === true, rowIndex)} aria-label={`选择第 ${rowIndex + 1} 行`} />
    if (column.type === 'index') return (currentPage - 1) * pageSize + rowIndex + 1
    if (column.type === 'expand') return <Button type="button" variant="ghost" size="icon-xs" aria-label={expandedKeys.has(getRowKey(row, rowIndex)) ? '收起行' : '展开行'} onClick={() => onExpandChange(row, rowIndex)}>{expandedKeys.has(getRowKey(row, rowIndex)) ? '−' : '+'}</Button>
    return renderTableCell(context, cellRenderers)
  }

  return <TableBody className="[&_tr:last-child>td]:border-b">{rows.length ? rows.map((row, rowIndex) => {
    const rowKey = getRowKey(row, rowIndex)
    const rowContext: MaTableCellContext<T> = { row, rowIndex, column: columns[0] ?? {} as MaTableColumn<T>, value: undefined }
    const expanded = expandedKeys.has(rowKey)
    return <React.Fragment key={rowKey}><TableRow data-state={selectedKeys.has(rowKey) ? 'selected' : undefined} className={cn('border-border border-b transition-none hover:bg-muted/40 data-[state=selected]:bg-muted/50 [&:not(:last-child)>td]:border-b', options.dense ? '[&>td]:h-10' : '[&>td]:h-12', options.border && '*:last:border-e-0', options.stripe && 'odd:bg-muted/90 odd:hover:bg-muted hover:bg-transparent', onRowClick && 'cursor-pointer', resolveRowClass(row, rowIndex, options.rowClassName))} style={resolveRowStyle(row, rowIndex, options.rowStyle)} onClick={event => handleRowClick(event, row, rowIndex)}>{columns.map((column, columnIndex) => <TableCell key={`${rowKey}-${String(column.prop ?? column.type ?? columnIndex)}`} className={cn('align-middle whitespace-normal first:ps-(--frame-panel-header-px) last:pe-(--frame-panel-header-px)', options.dense ? 'px-2 py-1.5' : 'px-3 py-2', options.border && 'border-e', column.className)} style={{ width: column.width, minWidth: column.minWidth, textAlign: column.align ?? options.columnAlign ?? 'left' }}>{renderCell(column, row, rowIndex)}</TableCell>)}</TableRow>{expanded && columns.some(column => column.type === 'expand') && <TableRow className="border-b transition-none"><TableCell colSpan={columns.length} className="align-middle whitespace-normal first:ps-(--frame-panel-header-px) last:pe-(--frame-panel-header-px)">{columns.find(column => column.type === 'expand')?.expandedRender?.(rowContext)}</TableCell></TableRow>}</React.Fragment>
  }) : <TableRow><TableCell colSpan={Math.max(columns.length, 1)} className="py-6 text-center text-sm text-muted-foreground">{loading ? '加载中…' : empty ?? options.emptyText ?? '暂无数据'}</TableCell></TableRow>}</TableBody>
}
