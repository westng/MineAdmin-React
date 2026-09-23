import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { FolderOpen, RefreshCw, SearchX, Upload } from 'lucide-react'
import { IconTile } from '@/components/reui/icon-tile'
import { Button } from '@/components/reui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/reui/primitives/empty'
import { Skeleton } from '@/components/reui/primitives/skeleton'
import { AttachmentGrid, type AttachmentCollectionProps } from './AttachmentGrid'
import { AttachmentList } from './AttachmentList'

const tx = createTextTranslator('base.data-center.attachment.ui')

interface Props extends AttachmentCollectionProps {
  view: 'grid' | 'list'
  loading: boolean
  error: string | null
  filtered: boolean
  canUpload: boolean
  onRefresh: () => void
  onReset: () => void
  onUpload: () => void
}

export function AttachmentResults({
  view,
  loading,
  error,
  filtered,
  canUpload,
  onRefresh,
  onReset,
  onUpload,
  ...collection
}: Props) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  if (loading)
    return (
      <div
        className={
          view === 'grid'
            ? 'grid grid-cols-1 gap-4 @sm:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5 @7xl:grid-cols-6'
            : 'space-y-3'
        }
        aria-label={tx('正在加载附件')}
      >
        {Array.from({ length: view === 'grid' ? 8 : 6 }, (_, index) => (
          <Skeleton
            key={index}
            className={
              view === 'grid'
                ? 'aspect-[4/3] rounded-xl motion-reduce:animate-none'
                : 'h-16 rounded-lg motion-reduce:animate-none'
            }
          />
        ))}
      </div>
    )
  if (error)
    return (
      <Empty className="min-h-80">
        <EmptyHeader>
          <IconTile variant="soft" size="lg">
            <FolderOpen aria-hidden="true" />
          </IconTile>
          <EmptyTitle>{tx('暂时无法加载附件')}</EmptyTitle>
          <EmptyDescription>{error}</EmptyDescription>
        </EmptyHeader>
        <Button type="button" variant="outline" onClick={onRefresh}>
          <RefreshCw aria-hidden="true" />
          {tx('重新加载')}
        </Button>
      </Empty>
    )
  if (!collection.rows.length)
    return (
      <Empty className="min-h-80">
        <EmptyHeader>
          <IconTile variant="soft" size="lg">
            {filtered ? <SearchX aria-hidden="true" /> : <FolderOpen aria-hidden="true" />}
          </IconTile>
          <EmptyTitle>{filtered ? tx('没有找到匹配的文件') : tx('文件库还是空的')}</EmptyTitle>
          <EmptyDescription>
            {filtered
              ? tx('试试其他文件类型或筛选条件。名称搜索需要输入文件全名。')
              : tx('上传第一个文件，在这里统一查看与管理。')}
          </EmptyDescription>
        </EmptyHeader>
        {filtered ? (
          <Button type="button" variant="outline" onClick={onReset}>
            {tx('清除筛选')}
          </Button>
        ) : (
          canUpload && (
            <Button type="button" onClick={onUpload}>
              <Upload aria-hidden="true" />
              {tx('上传文件')}
            </Button>
          )
        )}
      </Empty>
    )
  return view === 'grid' ? <AttachmentGrid {...collection} /> : <AttachmentList {...collection} />
}
