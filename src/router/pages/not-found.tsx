import { useTranslate } from '@/provider/i18n'
import { Link } from 'react-router-dom'
import { Button } from '@/components/reui/primitives/button'

export default function ErrorPage() {
  const t = useTranslate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-7xl font-semibold tracking-tight text-primary">404</p>
      <h1 className="text-2xl font-semibold">{t('router.notFound')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t('router.notFoundDescription')}</p>
      <Button render={<Link to="/dashboard" />}>{t('common.backDashboard')}</Button>
    </div>
  )
}
