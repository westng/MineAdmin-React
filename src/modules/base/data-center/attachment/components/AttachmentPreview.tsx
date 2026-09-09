import { useState } from 'react'
import { File, FileArchive, FileImage, FileText, Film, ImageOff, Music2 } from 'lucide-react'
import { IconTile } from '@/components/reui/icon-tile'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AttachmentVo } from '@/modules/base/user-center/api/attachment'
import { attachmentUrl } from '../utils/attachment'
import { attachmentKind, type AttachmentKind } from '../utils/library'

const fileStyles = {
  image: { icon: FileImage, tone: 'text-emerald-600 dark:text-emerald-400', label: '图片' },
  document: { icon: FileText, tone: 'text-blue-600 dark:text-blue-400', label: '文档' },
  video: { icon: Film, tone: 'text-violet-600 dark:text-violet-400', label: '视频' },
  audio: { icon: Music2, tone: 'text-pink-600 dark:text-pink-400', label: '音频' },
  archive: { icon: FileArchive, tone: 'text-amber-600 dark:text-amber-400', label: '压缩包' },
  file: { icon: File, tone: 'text-muted-foreground', label: '文件' },
} satisfies Record<AttachmentKind, { icon: typeof File; tone: string; label: string }>

function Thumbnail({ url, compact }: { url: string; compact: boolean }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  return <>
    {status === 'loading' && <Skeleton className="absolute inset-0 rounded-none motion-reduce:animate-none" />}
    {status === 'error' ? <span className="flex flex-col items-center gap-2 text-muted-foreground">
      <ImageOff className={compact ? 'size-5' : 'size-7'} aria-hidden="true" />
      {!compact && <span className="text-xs">预览不可用</span>}
    </span> : <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" className={cn('size-full object-contain', !compact && 'p-3', status === 'loading' && 'opacity-0')} onLoad={() => setStatus('ready')} onError={() => setStatus('error')} />}
  </>
}

export function AttachmentPreview({ row, compact = false, className }: { row: AttachmentVo; compact?: boolean; className?: string }) {
  const kind = attachmentKind(row)
  const style = fileStyles[kind]
  const Icon = style.icon
  const url = attachmentUrl(row.url)
  return <div className={cn('relative flex items-center justify-center overflow-hidden bg-muted/40', compact ? 'size-10 shrink-0 rounded-md' : 'aspect-[4/3] w-full', className)}>
    {kind === 'image' && url ? <Thumbnail key={url} url={url} compact={compact} /> : <span className="flex flex-col items-center gap-3">
      <IconTile variant="soft" size={compact ? 'sm' : 'xl'} className={style.tone}><Icon aria-hidden="true" /></IconTile>
      {!compact && <span className="text-xs font-medium tracking-wide text-muted-foreground">{row.suffix?.replace(/^\./, '').toUpperCase() || style.label}</span>}
    </span>}
  </div>
}
