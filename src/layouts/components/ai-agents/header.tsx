import { Bot, History, SquarePen } from 'lucide-react'
import { useContext, type ReactNode } from 'react'
import { Button } from '@/components/reui/primitives/button'
import { SheetTitle } from '@/components/reui/primitives/sheet'
import { AiAgentsHeaderContext } from './header-context'

export interface AiAgentsHeaderProps {
  /** 接入方控制显示名称；未设置或空白时使用 AI Agents。 */
  title?: string
  /** 可选的标题图标或头像，省略时使用默认机器人图标。 */
  icon?: ReactNode
  onNewSession?: () => void
  onHistory?: () => void
  disabled?: boolean
  newSessionDisabled?: boolean
  historyDisabled?: boolean
  historyExpanded?: boolean
  historyControls?: string
  newSessionLabel?: string
  historyLabel?: string
}

/** 可独立复用；会话状态、历史界面与标题的保存由接入方负责。 */
export function AiAgentsHeader({
  title,
  icon,
  onNewSession,
  onHistory,
  disabled = false,
  newSessionDisabled = false,
  historyDisabled = false,
  historyExpanded,
  historyControls,
  newSessionLabel,
  historyLabel,
}: AiAgentsHeaderProps) {
  const context = useContext(AiAgentsHeaderContext)
  const Heading = context.drawer ? SheetTitle : 'h2'
  const name = title?.trim() || 'AI Agents'
  const newLabel = newSessionLabel ?? context.newSessionLabel
  const historyText = historyLabel ?? context.historyLabel

  return (
    <div
      data-slot="ai-agents-header"
      className="grid h-[var(--header-height,3.125rem)] min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-4"
    >
      <Heading id={context.titleId} className="flex min-w-0 items-center gap-2 text-sm font-medium">
        {icon ?? <Bot className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <span className="truncate" title={name}>
          {name}
        </span>
      </Heading>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-slot="ai-agents-new-session"
          title={newLabel}
          aria-label={newLabel}
          disabled={disabled || newSessionDisabled || !onNewSession}
          onClick={onNewSession}
        >
          <SquarePen aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-slot="ai-agents-history"
          title={historyText}
          aria-label={historyText}
          aria-expanded={historyExpanded}
          aria-controls={historyControls}
          disabled={disabled || historyDisabled || !onHistory}
          onClick={onHistory}
        >
          <History aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
