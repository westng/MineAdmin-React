import { Bot, Brain, Globe, Mic, PanelRightClose, PanelRightOpen, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { MaDrawer } from '@/components/ma-drawer'
import { Button } from '@/components/reui/primitives/button'
import { Separator } from '@/components/reui/primitives/separator'
import { useSession } from '@/hooks/auth/use-session'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import { useShell } from '@/layouts/hooks/use-shell'
import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { cn } from '@/utils/cn'
import { AiAgentsComposer } from './composer'
import { usePanelResize } from './use-panel-resize'

export { AiAgentsComposer } from './composer'
export type { AiAgentsComposerProps } from './composer'

export function AiAgentsButton({ className }: { className?: string }) {
  const t = useTextTranslator('shell.ui')
  const { aiAgentsId, aiAgentsOpen, setAiAgentsOpen } = useShell()
  const label = aiAgentsOpen ? t('隐藏 AI Agents') : t('展开 AI Agents')
  const Icon = aiAgentsOpen ? PanelRightClose : PanelRightOpen

  return (
    <Button
      id={`${aiAgentsId}-trigger`}
      type="button"
      variant="outline"
      size="icon"
      className={cn('motion-reduce:transition-none', className)}
      title={label}
      aria-label={label}
      aria-controls={aiAgentsOpen ? aiAgentsId : undefined}
      aria-expanded={aiAgentsOpen}
      data-slot="ai-agents-trigger"
      onClick={() => setAiAgentsOpen(!aiAgentsOpen)}
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}

function AiAgentsEmptyContent() {
  const t = useTextTranslator('shell.ui')
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(true)
  const [search, setSearch] = useState(false)
  const [showStatus, setShowStatus] = useState(true)

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto py-8 text-center text-sm text-muted-foreground">
        <Bot className="size-8" aria-hidden="true" />
        <p>{t('暂无可用的 AI Agent')}</p>
      </div>
      <AiAgentsComposer
        value={draft}
        onValueChange={setDraft}
        placeholder={t('询问任何问题，或描述你想要的更改…')}
        sendLabel={t('发送消息')}
        hint={t('Shift + Enter 换行')}
        status={showStatus ? t('AI 智能助手') : undefined}
        onDismissStatus={() => setShowStatus(false)}
        dismissStatusLabel={t('关闭状态提示')}
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label={t('添加附件')}
              title={t('添加附件')}
            >
              <Plus aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 px-2 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
              aria-pressed={thinking}
              onClick={() => setThinking(!thinking)}
            >
              <Brain aria-hidden="true" />
              {t('思考')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 px-2 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
              aria-pressed={search}
              onClick={() => setSearch(!search)}
            >
              <Globe aria-hidden="true" />
              {t('搜索')}
            </Button>
          </>
        }
        trailingActions={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label={t('语音输入')}
            title={t('语音输入')}
          >
            <Mic aria-hidden="true" />
          </Button>
        }
        footer={t('请核实 AI 回复中的重要信息。')}
      />
    </>
  )
}

function AiAgentsContent() {
  const { pathname } = useShell()
  const userId = useSession(state => state.userInfo?.id)

  return (
    <div
      data-slot="ai-agents-content"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ShellSlotOutlet slot="shell.ai-agents" pathname={pathname} userId={userId} fallback={<AiAgentsEmptyContent />} />
    </div>
  )
}

export default function AiAgents() {
  const t = useTextTranslator('shell.ui')
  const { aiAgentsId, aiAgentsOpen, setAiAgentsOpen } = useShell()
  const isMobile = useIsMobile()
  const trigger = () => document.getElementById(`${aiAgentsId}-trigger`)
  const close = () => {
    setAiAgentsOpen(false)
    trigger()?.focus()
  }
  const title = (
    <span className="flex items-center gap-2">
      <Bot className="size-4 text-muted-foreground" aria-hidden="true" />
      AI Agents
    </span>
  )

  if (isMobile) {
    return (
      <MaDrawer
        open={aiAgentsOpen}
        onOpenChange={setAiAgentsOpen}
        title={title}
        description={t('AI 智能助手')}
        footer={false}
        resizable={false}
        disablePointerDismissal={false}
        width="min(22.5rem, calc(100vw - 2rem))"
        bodyClassName="flex flex-col overflow-hidden p-0"
        contentClassName="motion-reduce:transition-none"
        backdropProps={{ className: 'motion-reduce:transition-none' }}
        popupProps={{ id: aiAgentsId }}
        closeProps={{ 'aria-label': t('隐藏 AI Agents') }}
        finalFocus={trigger}
      >
        <AiAgentsContent />
      </MaDrawer>
    )
  }

  if (!aiAgentsOpen) return null

  return <AiAgentsDesktop title={title} close={close} />
}

function AiAgentsDesktop({ title, close }: { title: ReactNode; close: () => void }) {
  const t = useTextTranslator('shell.ui')
  const { aiAgentsId } = useShell()
  const { resizedWidth, separatorProps } = usePanelResize()

  return (
    <aside
      id={aiAgentsId}
      data-slot="ai-agents-panel"
      aria-labelledby={`${aiAgentsId}-title`}
      className="relative flex min-h-0 w-80 shrink-0 flex-col border-l border-border bg-background text-foreground xl:w-90"
      style={resizedWidth === undefined ? undefined : { width: resizedWidth }}
      onKeyDown={event => {
        if (event.key === 'Escape' && !event.defaultPrevented && event.currentTarget.contains(event.target as Node)) {
          event.preventDefault()
          close()
        }
      }}
    >
      <div className="flex h-(--header-height) shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <h2 id={`${aiAgentsId}-title`} className="text-sm font-medium">
          {title}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={t('隐藏 AI Agents')}
          aria-label={t('隐藏 AI Agents')}
          onClick={close}
        >
          <PanelRightClose aria-hidden="true" />
        </Button>
      </div>
      <AiAgentsContent />
      <Separator
        {...separatorProps}
        orientation="vertical"
        aria-label={t('调整 AI 面板宽度')}
        aria-controls={aiAgentsId}
        data-slot="ai-agents-resize-handle"
        className={cn(
          'absolute top-1/2 -left-[0.5px] z-10 h-24 w-3! -translate-x-1/2 -translate-y-1/2 cursor-col-resize touch-none select-none rounded-full bg-transparent outline-none',
          'after:absolute after:top-1/2 after:left-1/2 after:h-9 after:w-1 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-muted-foreground hover:after:bg-primary focus-visible:after:bg-primary data-resizing:after:bg-primary',
          'after:transition-transform after:duration-150 after:ease-out data-resizing:after:scale-y-200 motion-reduce:after:transition-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        )}
      />
    </aside>
  )
}
