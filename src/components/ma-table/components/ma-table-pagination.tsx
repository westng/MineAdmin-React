import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { Input } from '@/components/reui/primitives/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/reui/primitives/select'
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

export function MaTablePageJumper({
  currentPage,
  pageCount,
  onPageChange,
  disabled = false,
}: Pick<MaTablePaginationProps, 'currentPage' | 'pageCount' | 'onPageChange'> & { disabled?: boolean }) {
  const [draft, setDraft] = useState('')
  const value = Number(draft.trim())
  const valid = /^-?\d+$/.test(draft.trim()) && Number.isSafeInteger(value)

  const jump = () => {
    if (disabled || !valid) return
    const nextPage = Math.min(pageCount, Math.max(1, value))
    setDraft('')
    if (nextPage !== currentPage) onPageChange(nextPage)
  }

  return (
    <div className="order-3 flex shrink-0 items-center gap-1.5 text-sm" role="group" aria-label="指定页跳转">
      <span className="text-muted-foreground">前往</span>
      <Input
        className="h-7 w-16 px-2 text-center"
        inputMode="numeric"
        aria-label="跳转页码"
        aria-invalid={draft !== '' && !valid}
        title={`页码范围：1-${pageCount}`}
        placeholder={String(currentPage)}
        value={draft}
        disabled={disabled}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
          event.preventDefault()
          event.stopPropagation()
          jump()
        }}
      />
      <span className="text-muted-foreground">页</span>
      <Button type="button" size="sm" variant="outline" disabled={disabled || !valid} onClick={jump}>
        跳转
      </Button>
    </div>
  )
}

export function MaTablePagination({
  pagination,
  total,
  pageSize,
  currentPage,
  pageCount,
  onPageChange,
  onPageSizeChange,
}: MaTablePaginationProps) {
  const pageRange = getPageRange(currentPage, pageCount)

  return (
    <div className="flex grow flex-col flex-wrap items-center justify-between gap-2.5 py-2.5 text-sm sm:flex-row sm:py-0">
      <div className="order-2 flex flex-wrap items-center space-x-2.5 pb-2.5 text-muted-foreground sm:order-1 sm:pb-0">
        <span>每页</span>
        <Select value={String(pageSize)} onValueChange={value => onPageSizeChange(Number(value))}>
          <SelectTrigger size="sm" className="w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(pagination.pageSizes ?? [10, 20, 50, 100]).map(size => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="order-1 flex flex-col items-center justify-center gap-2.5 pt-2.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
        <span className="order-2 text-nowrap text-muted-foreground sm:order-1">
          共 {total} 条，第 {currentPage} / {pageCount} 页
        </span>
        {pageCount > 1 && (
          <div className="order-1 flex items-center space-x-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="p-0 text-sm rtl:transform rtl:rotate-180"
              disabled={currentPage <= 1 || Boolean(pagination.disabled)}
              onClick={() => onPageChange(currentPage - 1)}
              aria-label="上一页"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            {pageRange.start > 1 && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="p-0 text-sm"
                disabled={Boolean(pagination.disabled)}
                onClick={() => onPageChange(pageRange.start - 1)}
                aria-label="跳转到上一组页码"
              >
                ...
              </Button>
            )}
            {Array.from({ length: pageRange.end - pageRange.start + 1 }, (_, index) => pageRange.start + index).map(
              page => (
                <Button
                  key={page}
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className={`p-0 text-sm ${page === currentPage ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                  disabled={Boolean(pagination.disabled)}
                  onClick={() => onPageChange(page)}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </Button>
              ),
            )}
            {pageRange.end < pageCount && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="p-0 text-sm"
                disabled={Boolean(pagination.disabled)}
                onClick={() => onPageChange(pageRange.end + 1)}
                aria-label="跳转到下一组页码"
              >
                ...
              </Button>
            )}
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="p-0 text-sm rtl:transform rtl:rotate-180"
              disabled={currentPage >= pageCount || Boolean(pagination.disabled)}
              onClick={() => onPageChange(currentPage + 1)}
              aria-label="下一页"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}
        {pageCount > 1 && pagination.showQuickJumper !== false && (
          <MaTablePageJumper
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={onPageChange}
            disabled={pagination.disabled}
          />
        )}
      </div>
    </div>
  )
}
