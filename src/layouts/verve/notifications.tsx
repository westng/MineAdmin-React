import { Bell } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/reui/primitives/sheet'
import { useTranslate } from '@/provider/i18n'
import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { useVerveNavigation } from './navigation-context'

export function VerveNotifications() {
  const t = useTranslate()
  const { notificationsOpen, setNotificationsOpen } = useVerveNavigation()
  return (
    <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <SheetContent className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{t('通知')}</SheetTitle>
          <SheetDescription>{t('工作台通知')}</SheetDescription>
        </SheetHeader>
        <ShellSlotOutlet
          slot="notifications"
          fallback={
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
              <Bell className="size-8 opacity-40" />
              <p>{t('暂无通知')}</p>
            </div>
          }
        />
      </SheetContent>
    </Sheet>
  )
}
