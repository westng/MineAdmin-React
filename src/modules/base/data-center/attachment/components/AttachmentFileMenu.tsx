import { Copy, ExternalLink, Info, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { AttachmentVo } from '@/modules/base/user-center/api/attachment'
import { attachmentUrl } from '../utils/attachment'
import { attachmentName } from '../utils/library'

export interface AttachmentFileActions {
  canDelete: boolean
  disabled: boolean
  onDetail: (row: AttachmentVo) => void
  onCopy: (url: string) => void
  onDelete: (rows: AttachmentVo[]) => void
}

export function AttachmentFileMenu({ row, canDelete, disabled, onDetail, onCopy, onDelete }: AttachmentFileActions & { row: AttachmentVo }) {
  const url = attachmentUrl(row.url)
  return <DropdownMenu>
    <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label={`${attachmentName(row)} 的操作`} />}><MoreHorizontal aria-hidden="true" /></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-40">
      <DropdownMenuItem onClick={() => onDetail(row)}><Info aria-hidden="true" />文件详情</DropdownMenuItem>
      <DropdownMenuItem disabled={!url} onClick={() => { if (url) onCopy(url) }}><Copy aria-hidden="true" />复制地址</DropdownMenuItem>
      {url ? <DropdownMenuItem render={<a href={url} target="_blank" rel="noopener noreferrer" />}><ExternalLink aria-hidden="true" />打开文件</DropdownMenuItem> : <DropdownMenuItem disabled><ExternalLink aria-hidden="true" />地址不可用</DropdownMenuItem>}
      {canDelete && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => onDelete([row])}><Trash2 aria-hidden="true" />删除记录</DropdownMenuItem></>}
    </DropdownMenuContent>
  </DropdownMenu>
}
