import MainAside from '@/layouts/components/main-aside'
import SectionNavigation from '@/layouts/components/section-navigation'
import { useShell } from '@/hooks/shell/use-shell'
import { useIsMobile } from '@/hooks/framework/use-mobile'
export default function ColumnsNavigation() {
  const { activeSection } = useShell()
  const mobile = useIsMobile()
  return (
    <>
      <SectionNavigation vertical />
      <MainAside
        menusOverride={mobile ? undefined : (activeSection?.children ?? [])}
        sidebarOffset={mobile ? undefined : '4rem'}
      />
    </>
  )
}
