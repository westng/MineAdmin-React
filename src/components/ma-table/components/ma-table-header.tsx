import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { Checkbox } from '@/components/reui/primitives/checkbox'
import { TableHead, TableHeader, TableRow } from '@/components/reui/primitives/table'
import { cn } from '@/utils/cn'
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

export function MaTableHeader<T extends MaTableModel>({
  columns,
  options,
  sortState,
  allSelected,
  partiallySelected,
  onToggleAll,
  onToggleSort,
}: MaTableHeaderProps<T>) {
  return (
    <TableHeader>
      <TableRow className={cn('border-0 [&>th]:border-b', options.border && '*:last:border-e-0')}>
        {columns.map((column, columnIndex) => {
          const label = column.headerRender?.(column) ?? resolveColumnLabel(column)
          const sortIcon =
            sortState.prop === column.prop && sortState.order === 'ascending' ? (
              <ArrowUp className="size-3.25" aria-hidden="true" />
            ) : sortState.prop === column.prop && sortState.order === 'descending' ? (
              <ArrowDown className="size-3.25" aria-hidden="true" />
            ) : (
              <ChevronsUpDown className="mt-px size-3.25" aria-hidden="true" />
            )
          const content = !column.sortable ? (
            <div className="text-secondary-foreground/80 inline-flex h-full items-center gap-1.5 font-normal [&_svg]:size-3.5 [&_svg]:opacity-60 text-[0.8125rem] leading-[calc(1.125/0.8125)]">
              {label}
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="text-secondary-foreground/80 hover:bg-secondary data-[state=open]:bg-secondary hover:text-foreground data-[state=open]:text-foreground h-6 gap-1.5 rounded-lg px-2 font-normal [&_svg]:size-3.25"
              onClick={() => onToggleSort(column)}
            >
              {label}
              {sortIcon}
            </Button>
          )
          const ariaSort =
            sortState.prop === column.prop && sortState.order === 'ascending'
              ? 'ascending'
              : sortState.prop === column.prop && sortState.order === 'descending'
                ? 'descending'
                : column.sortable
                  ? 'none'
                  : undefined
          return (
            <TableHead
              key={`${String(column.prop ?? column.type ?? 'column')}-${columnIndex}`}
              className={cn(
                'relative text-foreground text-left align-middle font-medium rtl:text-right whitespace-normal first:ps-(--frame-panel-header-px) last:pe-(--frame-panel-header-px)',
                options.dense ? 'h-8 px-2' : 'h-10 px-3',
                options.border && 'border-e',
                column.headerClassName,
              )}
              aria-sort={ariaSort}
              style={{
                width: column.width,
                minWidth: column.minWidth,
                textAlign: column.headerAlign ?? options.headerAlign ?? options.columnAlign ?? 'left',
              }}
            >
              {column.type === 'selection' ? (
                <Checkbox
                  checked={allSelected}
                  aria-checked={partiallySelected ? 'mixed' : allSelected}
                  onCheckedChange={checked => onToggleAll(checked === true)}
                  aria-label="选择全部"
                />
              ) : (
                content
              )}
            </TableHead>
          )
        })}
      </TableRow>
    </TableHeader>
  )
}
