import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useState } from 'react'
import {
  ArrowDownWideNarrow,
  FileArchive,
  FileImage,
  FileText,
  Film,
  FolderOpen,
  Grid2X2,
  LayoutList,
  Music2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { Checkbox } from '@/components/reui/primitives/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/reui/primitives/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/reui/primitives/tabs'
import { useToast } from '@/components/reui/use-toast'
import { usePermission } from '@/hooks/framework/use-permission'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import { AttachmentDeleteDialog } from '../components/AttachmentDeleteDialog'
import { AttachmentDetail } from '../components/AttachmentDetail'
import { AttachmentFilters } from '../components/AttachmentFilters'
import { AttachmentResults } from '../components/AttachmentResults'
import { AttachmentPagination } from '../components/AttachmentPagination'
import { AttachmentUploadDialog } from '../components/AttachmentUploadDialog'
import { useAttachmentActions } from '../hooks/use-attachment-actions'
import { useAttachmentLibrary } from '../hooks/use-attachment-library'
import { categories, sortOptions, type AttachmentCategory, type AttachmentSort } from '../utils/library'

const tx = createTextTranslator('base.data-center.attachment.ui')

const categoryIcons = {
  all: FolderOpen,
  image: FileImage,
  document: FileText,
  video: Film,
  audio: Music2,
  archive: FileArchive,
}

export default function AttachmentPage() {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const { hasAuth } = usePermission()
  const { toast } = useToast()
  const canView = hasAuth('dataCenter:attachment:list')
  const canUpload = hasAuth('dataCenter:attachment:upload')
  const canDelete = hasAuth('dataCenter:attachment:delete')
  const library = useAttachmentLibrary(canView)
  const actions = useAttachmentActions(library.refresh, library.loading)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const busy = library.loading || actions.deleting
  const reset = () => {
    library.reset()
    setSearch('')
    toast(tx('已清除附件筛选'), 'success')
  }
  const collection = {
    rows: library.rows,
    selectedIds: library.selectedIds,
    onSelect: library.toggleSelection,
    canDelete,
    disabled: busy,
    onDetail: actions.setDetail,
    onCopy: actions.copyUrl,
    onDelete: actions.requestDelete,
  }

  useHeaderActions(
    canView && canUpload ? (
      <Button type="button" disabled={actions.deleting || uploadOpen} onClick={() => setUploadOpen(true)}>
        <Upload aria-hidden="true" />
        {tx('上传文件')}
      </Button>
    ) : null,
  )

  if (!canView)
    return (
      <div className="text-sm text-muted-foreground" role="status">
        {tx('暂无附件查看权限，请联系管理员。')}
      </div>
    )

  return (
    <section className="@container min-w-0" aria-label={tx('附件中心')}>
      <Tabs
        value={library.category}
        onValueChange={value => library.setCategory(value as AttachmentCategory)}
        className="min-w-0 flex-col gap-4"
      >
        <div className="w-full min-w-0 overflow-x-auto border-b pb-1">
          <TabsList variant="line" aria-label={tx('按文件类型浏览')} className="h-10 gap-4 p-0">
            {categories.map(category => {
              const Icon = categoryIcons[category.value]
              return (
                <TabsTrigger
                  key={category.value}
                  value={category.value}
                  disabled={actions.deleting}
                  className="h-9 flex-none px-1 after:inset-x-0 after:bottom-[-5px] after:h-0.5"
                >
                  <Icon aria-hidden="true" />
                  {category.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
        <TabsContent value={library.category} className="w-full min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <AttachmentFilters
              query={library.query}
              onQueryChange={library.setQuery}
              search={search}
              onSearchChange={setSearch}
              onSearch={library.setName}
              disabled={actions.deleting}
            />
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button type="button" variant="outline" disabled={actions.deleting} aria-label={tx('文件排序')} />
                  }
                >
                  <ArrowDownWideNarrow aria-hidden="true" />
                  <span className="hidden @xl:inline">
                    {sortOptions.find(option => option.value === library.sort)?.label}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={library.sort}
                    onValueChange={value => library.setSort(value as AttachmentSort)}
                  >
                    {sortOptions.map(option => (
                      <DropdownMenuRadioItem key={option.value} value={option.value}>
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center rounded-lg border p-0.5" role="group" aria-label={tx('文件视图')}>
                <Button
                  type="button"
                  size="icon-sm"
                  variant={view === 'grid' ? 'secondary' : 'ghost'}
                  aria-label={tx('网格视图')}
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                >
                  <Grid2X2 aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant={view === 'list' ? 'secondary' : 'ghost'}
                  aria-label={tx('列表视图')}
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                >
                  <LayoutList aria-hidden="true" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={tx('刷新附件')}
                disabled={busy}
                onClick={library.refresh}
              >
                <RefreshCw aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              {canDelete && (
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={library.rows.length > 0 && library.selectedIds.length === library.rows.length}
                    indeterminate={library.selectedIds.length > 0 && library.selectedIds.length < library.rows.length}
                    disabled={busy || !library.rows.length}
                    onCheckedChange={checked => library.select(checked ? library.rows.map(row => row.id) : [])}
                  />
                  {tx('选择本页')}
                </label>
              )}
              {library.selectedIds.length ? (
                <>
                  <span className="font-medium text-foreground">
                    {tx('已选')}
                    {library.selectedIds.length} {tx('个')}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={() => actions.requestDelete(library.selectedRows)}
                  >
                    <Trash2 aria-hidden="true" />
                    {tx('删除记录')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => library.select([])}>
                    {tx('取消选择')}
                  </Button>
                </>
              ) : (
                <span role="status">
                  {library.loading
                    ? tx('正在加载…')
                    : library.error
                      ? tx('加载失败')
                      : tx('{0} · {1} 个文件', {
                          '0': library.filtered ? '筛选结果' : '全部资源',
                          '1': library.total ?? 0,
                        })}
                </span>
              )}
            </div>
            {library.filtered && (
              <Button type="button" variant="ghost" size="sm" disabled={actions.deleting} onClick={reset}>
                <X aria-hidden="true" />
                {tx('清除筛选')}
              </Button>
            )}
          </div>

          <div className="min-h-80" aria-busy={library.loading}>
            <AttachmentResults
              {...collection}
              view={view}
              loading={library.loading}
              error={library.error}
              filtered={library.filtered}
              canUpload={canUpload}
              onRefresh={library.refresh}
              onReset={reset}
              onUpload={() => setUploadOpen(true)}
            />
          </div>
          {!library.error && (
            <AttachmentPagination
              page={library.page}
              pageSize={library.pageSize}
              total={library.total}
              disabled={busy}
              onPageChange={library.setPage}
              onPageSizeChange={library.setPageSize}
            />
          )}
        </TabsContent>
      </Tabs>

      {actions.detail && (
        <AttachmentDetail row={actions.detail} onClose={() => actions.setDetail(null)} onCopy={actions.copyUrl} />
      )}
      {uploadOpen && <AttachmentUploadDialog onClose={() => setUploadOpen(false)} onUploaded={library.refresh} />}
      <AttachmentDeleteDialog
        rows={actions.deleteRows}
        errors={actions.deleteErrors}
        pending={actions.deleting}
        onClose={actions.closeDelete}
        onConfirm={actions.confirmDelete}
      />
    </section>
  )
}
