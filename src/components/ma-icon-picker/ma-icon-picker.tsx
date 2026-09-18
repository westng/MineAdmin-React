import { useId, useState, type ComponentType } from 'react'
import { LoaderCircle } from 'lucide-react'
import { MaIcon } from '@/components/ma-icon'
import { Button } from '@/components/reui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/reui/primitives/dialog'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/reui/primitives/input-group'
import { cn } from '@/utils/cn'
import type { MaIconPanelProps, MaIconPickerProps } from './types'

export function MaIconPicker({
  value = '',
  onChange,
  className,
  placeholder = '点击后面按钮选择图标',
  pageSize = 70,
  disabled = false,
  readOnly = false,
  id,
  ...inputProps
}: MaIconPickerProps) {
  const generatedId = useId()
  const [open, setOpen] = useState(false)
  const [Panel, setPanel] = useState<ComponentType<MaIconPanelProps> | null>(null)
  const [loadError, setLoadError] = useState(false)
  const locked = disabled || readOnly

  async function loadPanel() {
    setLoadError(false)
    try {
      const module = await import('./ma-icon-panel')
      setPanel(() => module.MaIconPanel)
    } catch {
      setLoadError(true)
    }
  }

  function changeOpen(next: boolean) {
    if (next && locked) return
    setOpen(next)
    if (next && !Panel) void loadPanel()
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <div className={cn('flex w-full min-w-0 items-center gap-2', className)} role="group" aria-label="图标选择">
        <InputGroup className="min-w-0 flex-1">
          {value && (
            <InputGroupAddon>
              <MaIcon name={value} className="size-5" />
            </InputGroupAddon>
          )}
          <InputGroupInput
            {...inputProps}
            id={id ?? generatedId}
            aria-label={inputProps['aria-label'] ?? (inputProps['aria-labelledby'] ? undefined : '图标')}
            aria-haspopup="dialog"
            aria-expanded={open}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            readOnly
            className={cn(!locked && 'cursor-pointer')}
            onClick={() => changeOpen(true)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                changeOpen(true)
              }
            }}
          />
        </InputGroup>
        <DialogTrigger render={<Button type="button" disabled={locked} />}>选择图标</DialogTrigger>
        <Button type="button" variant="outline" disabled={locked || !value} onClick={() => onChange('')}>
          清空
        </Button>
      </div>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-[800px]">
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle>选择图标</DialogTitle>
          <DialogDescription className="sr-only">选择分类并搜索图标，点击图标后自动填入并关闭弹窗。</DialogDescription>
        </DialogHeader>
        {Panel ? (
          <Panel
            value={value}
            pageSize={pageSize}
            disabled={locked}
            onSelect={icon => {
              if (locked) return
              onChange(icon)
              changeOpen(false)
            }}
          />
        ) : (
          <div
            className="flex h-[min(500px,calc(100dvh-8rem))] flex-col items-center justify-center gap-3 text-muted-foreground"
            role="status"
          >
            {loadError ? (
              <>
                <p>图标列表加载失败，请重试。</p>
                <Button variant="outline" onClick={() => void loadPanel()}>
                  重新加载
                </Button>
              </>
            ) : (
              <>
                <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <p>正在加载图标列表…</p>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
