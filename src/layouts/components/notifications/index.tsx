import { Bell } from 'lucide-react'
import { MaDrawer } from '@/components/ma-drawer'
import { Button } from '@/components/reui/primitives/button'
import { useSession } from '@/hooks/framework/use-session'
import { useShell } from '@/hooks/shell/use-shell'
import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { useTranslate } from '@/provider/i18n'

export function NotificationsButton({ className }: { className?: string }) {
  const t = useTranslate()
  const { notificationsOpen, setNotificationsOpen } = useShell()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label={t('通知')}
      aria-haspopup="dialog"
      aria-expanded={notificationsOpen}
      data-slot="notifications-trigger"
      onClick={() => setNotificationsOpen(true)}
    >
      <Bell className="size-4" />
    </Button>
  )
}

export function NotificationsDrawer() {
  const t = useTranslate()
  const { pathname, notificationsOpen, setNotificationsOpen } = useShell()
  const userId = useSession(state => state.userInfo?.id)
  return (
    <MaDrawer
      open={notificationsOpen}
      onOpenChange={setNotificationsOpen}
      title={t('通知')}
      description={t('工作台通知')}
      footer={false}
      bodyClassName="flex flex-col"
    >
      <div data-slot="notifications-content" className="flex min-h-0 flex-1 flex-col">
        <ShellSlotOutlet
          slot="notifications"
          pathname={pathname}
          userId={userId}
          fallback={
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Bell className="size-8 opacity-40" />
              <p>{t('暂无通知')}</p>
            </div>
          }
        />
      </div>
    </MaDrawer>
  )
}
