import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  page: number
  pageSize: number
  total: number | null
  disabled: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function AttachmentPagination({ page, pageSize, total, disabled, onPageChange, onPageSizeChange }: Props) {
  const pageCount = Math.max(1, Math.ceil((total ?? 0) / pageSize))
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
    <p aria-live="polite">{total === null ? '正在加载附件…' : total ? `第 ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} 个，共 ${total} 个文件` : '共 0 个文件'}</p>
    <div className="flex items-center gap-3">
      <Select value={pageSize} onValueChange={value => { if (value) onPageSizeChange(value) }} disabled={disabled}>
        <SelectTrigger size="sm" aria-label="每页文件数量"><SelectValue /></SelectTrigger>
        <SelectContent>{[12, 24, 48].map(size => <SelectItem key={size} value={size}>{size} 个 / 页</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="上一页" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft aria-hidden="true" /></Button>
        <span className="min-w-14 text-center tabular-nums">{page} / {total === null ? '—' : pageCount}</span>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="下一页" disabled={disabled || page >= pageCount} onClick={() => onPageChange(page + 1)}><ChevronRight aria-hidden="true" /></Button>
      </div>
    </div>
  </div>
}
