import { DashboardSlotOutlet } from '../../dashboard-slot-outlet'

export default function DashboardPageView() {
  // 保留框架首页入口，业务内容由应用通过 Dashboard Slot 按需接入。
  return <DashboardSlotOutlet slot="main" />
}
