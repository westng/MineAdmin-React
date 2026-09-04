import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { resolveColumnLabel } from '../utils/table-utils'
import type { MaTableColumn, MaTableModel, MaTableOptions, MaTableSortOrder } from '../types'

export interface MaTableHeaderProps<T extends MaTableModel> {
  columns: MaTableColumn<T>[]
  options: MaTableOptions<T>
  sortState: { prop: string; order: MaTableSortOrder }
  allSelected: boolean
  partiallySelected: boolean
  onToggleAll: (checked: boolean) => void
  onToggleSort: (column: MaTableColumn<T>) => void
}

export function MaTableHeader<T extends MaTableModel>({ columns, options, sortState, allSelected, partiallySelected, onToggleAll, onToggleSort }: MaTableHeaderProps<T>) {
  return <TableHeader><TableRow>{columns.map((column, columnIndex) => {
    const label = column.headerRender?.(column) ?? resolveColumnLabel(column)
    const content = !column.sortable ? label : <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-1.5" onClick={() => onToggleSort(column)}>{label}{sortState.prop === column.prop && sortState.order === 'ascending' ? <ArrowUp className="size-3.5" aria-hidden="true" /> : sortState.prop === column.prop && sortState.order === 'descending' ? <ArrowDown className="size-3.5" aria-hidden="true" /> : <ChevronsUpDown className="size-3.5" aria-hidden="true" />}</Button>
    const ariaSort = sortState.prop === column.prop && sortState.order === 'ascending' ? 'ascending' : sortState.prop === column.prop && sortState.order === 'descending' ? 'descending' : column.sortable ? 'none' : undefined
    return <TableHead key={`${String(column.prop ?? column.type ?? 'column')}-${columnIndex}`} className={column.headerClassName} aria-sort={ariaSort} style={{ width: column.width, minWidth: column.minWidth, textAlign: column.headerAlign ?? options.headerAlign ?? options.columnAlign ?? 'left' }}>{column.type === 'selection' ? <Checkbox checked={allSelected} aria-checked={partiallySelected ? 'mixed' : allSelected} onCheckedChange={checked => onToggleAll(checked === true)} aria-label="选择全部" /> : content}</TableHead>
  })}</TableRow></TableHeader>
}
