import { DashboardSlotOutlet } from './components/DashboardSlotOutlet'
import { useTextTranslator } from '@/hooks/i18n/use-translator'

export default function DashboardPageView() {
  const tx = useTextTranslator('base.dashboard.ui')
  // 保留框架首页入口，业务内容由应用通过 Dashboard Slot 按需接入。
  return (
    <DashboardSlotOutlet
      slot="main"
      fallback={<p className="p-6 text-sm text-muted-foreground">{tx('暂无工作台内容')}</p>}
    />
  )
}
