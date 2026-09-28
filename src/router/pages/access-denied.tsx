import { useTranslate } from '@/hooks/i18n/use-translator'
import { Link } from 'react-router-dom'
import { useSettingStore } from '@/store/settings/use-settings'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/reui/primitives/card'

export default function AccessDeniedPage() {
  const t = useTranslate()
  const dashboardPath = useSettingStore(state => state.settings.dashboardPage.path)
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg shadow-none">
        <CardHeader>
          <ShieldAlert className="size-6 text-destructive" aria-hidden="true" />
          <CardTitle>{t('router.deniedTitle')}</CardTitle>
          <CardDescription>{t('router.deniedDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link to={dashboardPath} />}>
            {t('common.backDashboard')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
