import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { Frame, FramePanel } from '@/components/reui/frame'
import { Checkbox } from '@/components/reui/primitives/checkbox'
import { cn } from '@/utils/cn'
import type { AttachmentVo } from '@/modules/base/user-center/api/attachment'
import { formatFileSize } from '../data/attachment'
import { attachmentName } from '../data/library'
import { AttachmentFileMenu, type AttachmentFileActions } from './AttachmentFileMenu'
import { AttachmentPreview } from './AttachmentPreview'

const tx = createTextTranslator('base.data-center.attachment.ui')

export interface AttachmentCollectionProps extends AttachmentFileActions {
  rows: AttachmentVo[]
  selectedIds: number[]
  onSelect: (id: number, checked: boolean) => void
}

export function AttachmentGrid({ rows, selectedIds, onSelect, ...actions }: AttachmentCollectionProps) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <ul
      className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5 @7xl:grid-cols-6"
      aria-label={tx('附件网格')}
    >
      {rows.map(row => {
        const selected = selectedIds.includes(row.id)
        const name = attachmentName(row)
        return (
          <li key={row.id} className="min-w-0">
            <Frame
              dense
              className={cn(
                'h-full transition-shadow hover:shadow-sm motion-reduce:transition-none',
                selected && 'ring-2 ring-primary',
              )}
            >
              <FramePanel className="p-0 shadow-none">
                <button
                  type="button"
                  className="block w-full rounded-t-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  aria-label={tx('查看 {0}', { '0': name })}
                  onClick={() => actions.onDetail(row)}
                >
                  <AttachmentPreview row={row} />
                </button>
                <div className="space-y-2 border-t px-3 py-3">
                  <div className="flex items-center gap-2">
                    {actions.canDelete && (
                      <Checkbox
                        checked={selected}
                        disabled={actions.disabled}
                        aria-label={tx('选择 {0}', { '0': name })}
                        onCheckedChange={checked => onSelect(row.id, checked)}
                      />
                    )}
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate rounded-sm text-left text-sm font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                      title={name}
                      onClick={() => actions.onDetail(row)}
                    >
                      {name}
                    </button>
                    <AttachmentFileMenu row={row} {...actions} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatFileSize(row.size_byte)}</span>
                    <span>{row.created_at?.slice(0, 10) || tx('日期未记录')}</span>
                  </div>
                </div>
              </FramePanel>
            </Frame>
          </li>
        )
      })}
    </ul>
  )
}
