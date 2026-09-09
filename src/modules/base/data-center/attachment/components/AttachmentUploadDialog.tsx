import { Check, File, FileUp, LoaderCircle, RotateCcw, Upload, X } from 'lucide-react'
import { MaDialog } from '@/components/ma-dialog'
import { Frame, FrameHeader, FramePanel, FrameTitle } from '@/components/reui/frame'
import { IconTile } from '@/components/reui/icon-tile'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAttachmentUpload } from '../hooks/use-attachment-upload'
import { formatFileSize } from '../utils/attachment'

export function AttachmentUploadDialog({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const { items, pending, isDragging, fileActions, removeFile, startUpload } = useAttachmentUpload(onUploaded)
  const remaining = items.filter(item => item.status === 'queued' || item.status === 'error').length
  const completed = items.filter(item => item.status === 'success').length
  return <MaDialog
    open
    onOpenChange={open => { if (!open && !pending) onClose() }}
    title="上传文件"
    description="添加文件到附件中心，支持同时选择多个文件。"
    contentClassName="sm:max-w-xl"
    showFullscreenButton={false}
    showCloseButton={!pending}
    loading={pending}
    footer={<>
      <Button type="button" variant="outline" disabled={pending} onClick={onClose}>{remaining ? '关闭' : '完成'}</Button>
      <Button type="button" disabled={pending || !remaining} onClick={() => void startUpload()}>
        {pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Upload aria-hidden="true" />}
        {pending ? '上传中…' : `上传${remaining ? ` ${remaining} 个文件` : ''}`}
      </Button>
    </>}
  >
    <div className="space-y-5">
      <div
        className={cn('flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-5 py-8 text-center transition-colors motion-reduce:transition-none', isDragging && !pending && 'border-primary bg-primary/5', pending && 'opacity-60')}
        onDragEnter={event => { if (!pending) fileActions.handleDragEnter(event) }}
        onDragLeave={fileActions.handleDragLeave}
        onDragOver={fileActions.handleDragOver}
        onDrop={event => { if (pending) event.preventDefault(); else fileActions.handleDrop(event) }}
      >
        <input {...fileActions.getInputProps({ disabled: pending, 'aria-label': '选择待上传的文件' })} className="sr-only" />
        <IconTile variant="frame" size="xl"><FileUp aria-hidden="true" /></IconTile>
        <div className="space-y-1"><p className="text-sm font-medium">{isDragging && !pending ? '松开鼠标，添加文件' : '将文件拖到这里'}</p><p className="text-xs text-muted-foreground">或从设备中选择要上传的文件</p></div>
        <Button type="button" variant="outline" disabled={pending} onClick={fileActions.openFileDialog}>选择文件</Button>
        <p className="text-xs text-muted-foreground">文件大小和类型以服务器限制为准</p>
      </div>
      {items.length > 0 && <Frame dense spacing="sm">
        <FrameHeader className="flex-row items-center justify-between py-2.5"><FrameTitle>上传队列 <span className="ml-1 font-normal text-muted-foreground">{items.length}</span></FrameTitle><span className="text-xs text-muted-foreground" role="status">{completed} / {items.length} 已完成</span></FrameHeader>
        <FramePanel className="max-h-72 overflow-y-auto p-0 shadow-none">
          <ul className="divide-y">{items.map(item => <li key={item.id} className="flex gap-3 p-3">
            {item.file.type.startsWith('image/') && item.preview ? <img src={item.preview} alt="" className="size-10 shrink-0 rounded-md border bg-muted object-cover" /> : <IconTile variant="outline"><File aria-hidden="true" /></IconTile>}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium" title={item.file.name}>{item.file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
              <p className={cn('text-xs', item.status === 'error' ? 'text-destructive' : 'text-muted-foreground')} role="status">
                {item.status === 'queued' ? '等待上传' : item.status === 'success' ? '上传成功' : item.status === 'error' ? item.error : item.progress === 100 ? '服务器处理中…' : `正在上传${item.progress === null ? '…' : ` ${item.progress}%`}`}
              </p>
              {item.status === 'uploading' && <progress className="h-1.5 w-full accent-primary" aria-label={`${item.file.name} 上传进度`} value={item.progress ?? undefined} max={100} />}
            </div>
            <div className="flex shrink-0 items-start gap-1">
              {item.status === 'success' && <Check className="m-1.5 size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
              {item.status === 'error' && <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label={`重试 ${item.file.name}`} onClick={() => void startUpload(item.id)}><RotateCcw aria-hidden="true" /></Button>}
              <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label={`移除 ${item.file.name}`} onClick={() => removeFile(item.id)}><X aria-hidden="true" /></Button>
            </div>
          </li>)}</ul>
        </FramePanel>
      </Frame>}
    </div>
  </MaDialog>
}
