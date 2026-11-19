import type { ReactNode } from 'react'
import { MessageSquare } from 'lucide-react'
import { Switch } from '@base-ui/react/switch'
import { IconTile } from '@/components/reui/icon-tile'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/reui/primitives/tooltip'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import type { AppSettings } from '@/store/settings/types'
import { cn } from '@/utils/cn'

export function PreferenceRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: typeof MessageSquare
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <div className="flex items-center justify-between gap-6 border-b px-4 py-4 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <IconTile variant="elevated" size="sm" className="mt-0.5 text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </IconTile>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        nativeButton
        render={<button type="button" aria-label={label} />}
        className="flex h-5 w-9 shrink-0 items-center rounded-full border border-input bg-muted p-0.5 transition-colors outline-none data-checked:border-primary data-checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Switch.Thumb className="size-3.5 rounded-full bg-foreground transition-transform data-checked:translate-x-4 data-checked:bg-primary-foreground" />
      </Switch.Root>
    </div>
  )
}

export function LayoutPreview({ kind }: { kind: string }) {
  if (kind === 'columns') {
    return (
      <span aria-hidden="true" className="flex h-10 w-[4.5rem] gap-0.5 overflow-hidden rounded-[3px] bg-muted/30 p-0.5">
        <span className="w-1.5 shrink-0 rounded-[2px] bg-primary" />
        <span className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[3px] border border-primary/30">
          <span className="h-1.5 shrink-0 border-b border-primary/20 bg-primary/10" />
          <span className="flex min-h-0 flex-1">
            <span className="w-1/4 border-r border-primary/20 bg-primary/45" />
            <span className="min-w-0 flex-1 bg-primary/15" />
          </span>
        </span>
      </span>
    )
  }

  if (kind === 'mixed') {
    return (
      <span className="flex h-10 w-[4.5rem] flex-col gap-0.5 overflow-hidden rounded-[3px] bg-muted/30 p-0.5">
        <span className="h-1/5 rounded-[2px] bg-primary" />
        <span className="flex min-h-0 flex-1 gap-0.5">
          <span className="w-1/4 rounded-[2px] bg-primary/55" />
          <span className="min-w-0 flex-1 rounded-[2px] bg-primary/15" />
        </span>
      </span>
    )
  }

  return (
    <span className="flex h-10 w-[4.5rem] gap-0.5 overflow-hidden rounded-[3px] bg-muted/30 p-0.5">
      <span className="w-1/4 rounded-[2px] bg-primary" />
      <span className="min-w-0 flex-1 rounded-[2px] bg-primary/25" />
    </span>
  )
}

export function ContentWidthPreview({ value }: { value: AppSettings['contentWidth'] }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-[4.5rem] flex-col gap-0.5 overflow-hidden rounded-[3px] bg-muted/30 p-0.5"
    >
      <span className="h-1.5 shrink-0 rounded-[2px] bg-primary" />
      <span className="flex min-h-0 flex-1 justify-center rounded-[2px] border border-primary/20 bg-primary/5 p-0.5">
        <span
          className={cn(
            'flex min-w-0 flex-col gap-0.5 rounded-[1px] bg-primary/20 p-0.5',
            value === 'bounded' ? 'w-2/3' : 'w-full',
          )}
        >
          <span className="h-1 w-2/3 shrink-0 rounded-[1px] bg-primary/60" />
          <span className="min-h-0 flex-1 rounded-[1px] bg-primary/30" />
        </span>
      </span>
    </span>
  )
}

export function PreviewPicker<Value extends string>({
  options,
  value,
  onChange,
  label,
  renderPreview,
}: {
  options: readonly { id: Value; label: string; labelKey?: string }[]
  value: Value
  onChange: (value: Value) => void
  label: string
  renderPreview: (value: Value) => ReactNode
}) {
  const tx = useTextTranslator('base.account-settings.ui')

  return (
    <TooltipProvider>
      <div
        role="radiogroup"
        aria-label={label}
        className="col-span-full flex min-w-0 flex-wrap justify-end gap-2 @2xl:col-span-1"
      >
        {options.map((option, index) => {
          const selected = value === option.id
          const optionLabel = option.labelKey ? tx(option.labelKey) : option.label
          return (
            <Tooltip key={option.id}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={optionLabel}
                    tabIndex={selected || (!options.some(item => item.id === value) && index === 0) ? 0 : -1}
                    onClick={() => onChange(option.id)}
                    onKeyDown={event => {
                      const delta = ['ArrowRight', 'ArrowDown'].includes(event.key)
                        ? 1
                        : ['ArrowLeft', 'ArrowUp'].includes(event.key)
                          ? -1
                          : 0
                      if (!delta) return
                      event.preventDefault()
                      const next = (index + delta + options.length) % options.length
                      onChange(options[next].id)
                      const buttons =
                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                      buttons?.[next]?.focus()
                    }}
                    className={cn(
                      'flex h-[3.75rem] w-[5.25rem] items-center justify-center rounded-md border-2 bg-background p-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      selected ? 'border-primary shadow-sm' : 'border-border hover:border-primary/50',
                    )}
                  >
                    {renderPreview(option.id)}
                  </button>
                }
              />
              <TooltipContent>{optionLabel}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
