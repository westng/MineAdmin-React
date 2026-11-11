import { Activity, ArrowUp, LoaderCircle, X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Button } from '@/components/reui/primitives/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/reui/primitives/input-group'
import { cn } from '@/utils/cn'

export interface AiAgentsComposerProps {
  value: string
  onValueChange: (value: string) => void
  onSend?: (message: string) => void
  disabled?: boolean
  pending?: boolean
  placeholder?: string
  sendLabel?: string
  hint?: string
  notice?: ReactNode
  status?: ReactNode
  onDismissStatus?: () => void
  dismissStatusLabel?: string
  actions?: ReactNode
  trailingActions?: ReactNode
  footer?: ReactNode
}

/** ReUI InputGroup composition; the consumer owns requests and draft clearing. */
export function AiAgentsComposer({
  value,
  onValueChange,
  onSend,
  disabled = false,
  pending = false,
  placeholder = '输入消息…',
  sendLabel = '发送消息',
  hint = 'Shift + Enter 换行',
  notice,
  status,
  onDismissStatus,
  dismissStatusLabel = '关闭状态提示',
  actions,
  trailingActions,
  footer,
}: AiAgentsComposerProps) {
  const hintId = useId()
  const locked = disabled || pending
  const canSend = !locked && Boolean(onSend) && Boolean(value.trim())
  const send = () => {
    if (canSend) onSend?.(value.trim())
  }

  return (
    <form
      data-slot="ai-agents-composer"
      className="flex w-full min-w-0 shrink-0 flex-col gap-2"
      aria-busy={pending}
      onSubmit={event => {
        event.preventDefault()
        send()
      }}
    >
      {notice && <div data-slot="ai-agents-composer-notice">{notice}</div>}
      <div className="min-w-0 rounded-2xl border border-border bg-muted/40">
        {status && (
          <div
            data-slot="ai-agents-composer-status"
            className="flex min-h-9 items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground"
          >
            <Activity className="size-3 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">{status}</div>
            {onDismissStatus && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={dismissStatusLabel}
                onClick={onDismissStatus}
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
        <InputGroup
          className={cn(
            '-m-px w-[calc(100%+2px)] rounded-2xl border-border bg-background shadow-none motion-reduce:transition-none',
            !locked && 'has-disabled:bg-background has-disabled:opacity-100 dark:has-disabled:bg-background',
          )}
        >
          <InputGroupTextarea
            name="message"
            value={value}
            onChange={event => onValueChange(event.target.value)}
            disabled={locked}
            placeholder={placeholder}
            aria-label={placeholder}
            aria-describedby={hint ? hintId : undefined}
            className="min-h-16 max-h-40 overflow-y-auto px-3 py-2.5 motion-reduce:transition-none"
            onKeyDown={event => {
              if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) {
                return
              }
              event.preventDefault()
              if (!event.repeat) send()
            }}
          />
          <InputGroupAddon align="block-end" className="flex-wrap gap-x-1 gap-y-2 px-2.5 pb-2">
            <div data-slot="ai-agents-composer-actions" className="flex min-w-0 flex-wrap items-center gap-1">
              {actions}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {trailingActions}
              <InputGroupButton
                type="submit"
                variant="ghost"
                size="icon-sm"
                disabled={!canSend}
                aria-label={sendLabel}
                title={hint ? `${sendLabel} · ${hint}` : sendLabel}
                className="rounded-lg bg-foreground text-background hover:bg-foreground/90 hover:text-background motion-reduce:transition-none"
              >
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <ArrowUp className="size-4" aria-hidden="true" />
                )}
              </InputGroupButton>
            </div>
          </InputGroupAddon>
        </InputGroup>
      </div>
      {hint && (
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      )}
      {footer && (
        <div data-slot="ai-agents-composer-footer" className="text-center text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </form>
  )
}
