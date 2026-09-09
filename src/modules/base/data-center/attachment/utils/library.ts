import type { AttachmentSearchParams, AttachmentVo } from '@/modules/base/user-center/api/attachment'
import type { FilterQuery } from '@/components/reui/filters/filters-types'
import { attachmentSearch } from './attachment'

export const categories = [
  { value: 'all', label: '全部文件', suffixes: '' },
  { value: 'image', label: '图片', suffixes: 'jpg,jpeg,png,gif,webp,svg,bmp,ico,avif,heic,heif,tif,tiff' },
  { value: 'document', label: '文档', suffixes: 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md,csv,rtf,odt,ods,odp,json,xml' },
  { value: 'video', label: '视频', suffixes: 'mp4,mov,avi,mkv,webm,m4v,wmv,flv,mpeg,mpg' },
  { value: 'audio', label: '音频', suffixes: 'mp3,wav,ogg,flac,aac,m4a,wma,opus' },
  { value: 'archive', label: '压缩包', suffixes: 'zip,rar,7z,tar,gz,bz2,xz,tgz' },
] as const

export type AttachmentCategory = typeof categories[number]['value']
export type AttachmentKind = Exclude<AttachmentCategory, 'all'> | 'file'
export const sortOptions = [
  { value: 'newest', label: '最新上传', order_by: 'id', order_by_direction: 'desc' },
  { value: 'oldest', label: '最早上传', order_by: 'id', order_by_direction: 'asc' },
  { value: 'name', label: '名称 A–Z', order_by: 'origin_name', order_by_direction: 'asc' },
  { value: 'largest', label: '文件从大到小', order_by: 'size_byte', order_by_direction: 'desc' },
] as const
export type AttachmentSort = typeof sortOptions[number]['value']

export function emptyAttachmentQuery(): FilterQuery {
  return { id: 'attachment-filters', type: 'group', combinator: 'and', rules: [] }
}

export function attachmentName(row: AttachmentVo) {
  return row.origin_name || row.object_name || `附件 #${row.id}`
}

export function attachmentKind(row: Pick<AttachmentVo, 'mime_type' | 'suffix' | 'origin_name'>): AttachmentKind {
  const mime = row.mime_type?.toLowerCase() ?? ''
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  const suffix = (row.suffix || row.origin_name?.split('.').pop() || '').replace(/^\./, '').toLowerCase()
  const category = categories.find(category => category.value !== 'all' && category.suffixes.split(',').includes(suffix))
  return category && category.value !== 'all' ? category.value : 'file'
}

export function attachmentFilterParams(query: FilterQuery): AttachmentSearchParams {
  if (query.combinator !== 'and') throw new Error('筛选条件仅支持同时满足')
  const params: Record<string, unknown> = {}
  const seen = new Set<string>()
  for (const rule of query.rules) {
    if (rule.type !== 'rule' || rule.negated || rule.path.length !== 1) throw new Error('暂不支持条件分组或反选')
    const field = rule.path[0]
    if (!['storage_mode', 'suffix', 'created_at'].includes(field)) throw new Error('未知的筛选项')
    if (seen.has(field)) throw new Error('同一筛选项只能添加一次，请修改已有条件')
    seen.add(field)
    // ReUI commits the field, operator and value in separate steps.
    // Keep unfinished chips editable; only complete conditions reach the API.
    if (!rule.operator || rule.value == null || rule.value === '') continue
    if (field === 'created_at' && rule.operator === 'between' && Array.isArray(rule.value)) {
      params.start_date = rule.value[0]
      params.end_date = rule.value[1]
    } else if (['storage_mode', 'suffix'].includes(field) && rule.operator === 'is' && typeof rule.value === 'string' && rule.value.trim()) {
      params[field] = rule.value
    } else throw new Error('请填写完整的筛选条件')
  }
  const { storage_mode, suffix, created_at } = attachmentSearch(params)
  if (params.storage_mode && !storage_mode) throw new Error('请选择有效的存储位置')
  if (params.suffix && (!suffix || !suffix.split(',').every(value => /^[a-z0-9]+$/.test(value)))) throw new Error('请输入有效的扩展名，例如 pdf 或 jpg,png')
  return { storage_mode, suffix, created_at }
}
