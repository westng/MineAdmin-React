import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MaTablePagination } from '../types'

export interface MaTablePaginationProps {
  pagination: MaTablePagination
  total: number
  pageSize: number
  currentPage: number
  pageCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

function getPageRange(currentPage: number, pageCount: number): { start: number; end: number } {
  const start = Math.floor((currentPage - 1) / 5) * 5 + 1
  return { start, end: Math.min(start + 4, pageCount) }
}

export function MaTablePagination({ pagination, total, pageSize, currentPage, pageCount, onPageChange, onPageSizeChange }: MaTablePaginationProps) {
  const pageRange = getPageRange(currentPage, pageCount)

  return <div className="flex grow flex-col flex-wrap items-center justify-between gap-2.5 py-2.5 text-sm sm:flex-row sm:py-0">
    <div className="order-2 flex flex-wrap items-center space-x-2.5 pb-2.5 text-muted-foreground sm:order-1 sm:pb-0">
      <span>每页</span>
      <Select value={String(pageSize)} onValueChange={value => onPageSizeChange(Number(value))}>
        <SelectTrigger size="sm" className="w-16"><SelectValue /></SelectTrigger>
        <SelectContent>{(pagination.pageSizes ?? [10, 20, 50, 100]).map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="order-1 flex flex-col items-center justify-center gap-2.5 pt-2.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
      <span className="order-2 text-nowrap text-muted-foreground sm:order-1">共 {total} 条，第 {currentPage} / {pageCount} 页</span>
      {pageCount > 1 && <div className="order-1 flex items-center space-x-1">
        <Button type="button" size="icon-sm" variant="ghost" className="p-0 text-sm rtl:transform rtl:rotate-180" disabled={currentPage <= 1 || Boolean(pagination.disabled)} onClick={() => onPageChange(currentPage - 1)} aria-label="上一页"><ChevronLeft className="size-4" aria-hidden="true" /></Button>
        {pageRange.start > 1 && <Button type="button" size="icon-sm" variant="ghost" className="p-0 text-sm" disabled={Boolean(pagination.disabled)} onClick={() => onPageChange(pageRange.start - 1)} aria-label="跳转到上一组页码">...</Button>}
        {Array.from({ length: pageRange.end - pageRange.start + 1 }, (_, index) => pageRange.start + index).map(page => <Button key={page} type="button" size="icon-sm" variant="ghost" className={`p-0 text-sm ${page === currentPage ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`} disabled={Boolean(pagination.disabled)} onClick={() => onPageChange(page)} aria-current={page === currentPage ? 'page' : undefined}>{page}</Button>)}
        {pageRange.end < pageCount && <Button type="button" size="icon-sm" variant="ghost" className="p-0 text-sm" disabled={Boolean(pagination.disabled)} onClick={() => onPageChange(pageRange.end + 1)} aria-label="跳转到下一组页码">...</Button>}
        <Button type="button" size="icon-sm" variant="ghost" className="p-0 text-sm rtl:transform rtl:rotate-180" disabled={currentPage >= pageCount || Boolean(pagination.disabled)} onClick={() => onPageChange(currentPage + 1)} aria-label="下一页"><ChevronRight className="size-4" aria-hidden="true" /></Button>
      </div>
      }
    </div>
  </div>
}
