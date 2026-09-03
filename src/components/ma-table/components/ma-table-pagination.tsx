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

export function MaTablePagination({ pagination, total, pageSize, currentPage, pageCount, onPageChange, onPageSizeChange }: MaTablePaginationProps) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-sm text-muted-foreground"><span>共 {total} 条</span><div className="flex items-center gap-2"><span>每页</span><Select value={String(pageSize)} onValueChange={value => onPageSizeChange(Number(value))}><SelectTrigger className="h-7 w-20"><SelectValue /></SelectTrigger><SelectContent>{(pagination.pageSizes ?? [10, 20, 50, 100]).map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="sm" disabled={currentPage <= 1 || Boolean(pagination.disabled)} onClick={() => onPageChange(currentPage - 1)}>上一页</Button><span>第 {currentPage} / {pageCount} 页</span><Button type="button" variant="outline" size="sm" disabled={currentPage >= pageCount || Boolean(pagination.disabled)} onClick={() => onPageChange(currentPage + 1)}>下一页</Button></div></div>
}
