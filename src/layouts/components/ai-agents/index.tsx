import { Bot, Brain, Globe, Mic, PanelRightClose, PanelRightOpen, Plus } from 'lucide-react'
import { useState } from 'react'
import { MaDrawer } from '@/components/ma-drawer'
import { Button } from '@/components/reui/primitives/button'
import { Separator } from '@/components/reui/primitives/separator'
import { SheetDescription } from '@/components/reui/primitives/sheet'
import { useSession } from '@/hooks/auth/use-session'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import { useShell } from '@/layouts/hooks/use-shell'
import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { cn } from '@/utils/cn'
import { AiAgentsComposer } from './composer'
import { AiAgentsHeader } from './header'
import { AiAgentsHeaderContext } from './header-context'
import { usePanelResize } from './use-panel-resize'

export { AiAgentsComposer } from './composer'
export type { AiAgentsComposerProps } from './composer'
export { AiAgentsHeader } from './header'
export type { AiAgentsHeaderProps } from './header'

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
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ShellSlotOutlet slot="shell.ai-agents" pathname={pathname} userId={userId} fallback={<AiAgentsEmptyContent />} />
    </div>
  )
}

function AiAgentsHeaderOutlet({ drawer = false }: { drawer?: boolean }) {
  const t = useTextTranslator('shell.ui')
  const { aiAgentsId, pathname } = useShell()
  const userId = useSession(state => state.userInfo?.id)
  const sessionVersion = useSession(state => state.sessionVersion)

  return (
    <AiAgentsHeaderContext.Provider
      value={{
        titleId: `${aiAgentsId}-title`,
        drawer,
        newSessionLabel: t('新建会话'),
        historyLabel: t('历史会话'),
      }}
    >
      <ShellSlotOutlet
        key={sessionVersion}
        slot="shell.ai-agents.header"
        pathname={pathname}
        userId={userId}
        fallback={<AiAgentsHeader />}
      />
    </AiAgentsHeaderContext.Provider>
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
  if (isMobile) {
    return (
      <MaDrawer
        open={aiAgentsOpen}
        onOpenChange={setAiAgentsOpen}
        header={false}
        showCloseButton={false}
        footer={false}
        resizable={false}
        disablePointerDismissal={false}
        width="min(22.5rem, calc(100vw - 2rem))"
        bodyClassName="flex flex-col overflow-hidden p-0"
        contentClassName="motion-reduce:transition-none"
        backdropProps={{ className: 'motion-reduce:transition-none' }}
        popupProps={{ id: aiAgentsId }}
        finalFocus={trigger}
      >
        <AiAgentsHeaderOutlet drawer />
        <SheetDescription className="sr-only">{t('AI 智能助手')}</SheetDescription>
        <AiAgentsContent />
      </MaDrawer>
    )
  }

  if (!aiAgentsOpen) return null

  return <AiAgentsDesktop close={close} />
}

function AiAgentsDesktop({ close }: { close: () => void }) {
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
      <AiAgentsHeaderOutlet />
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
