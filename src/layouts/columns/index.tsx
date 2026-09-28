import MainAside from '@/layouts/components/main-aside'
import SectionNavigation from '@/layouts/components/section-navigation'
import { useShell } from '@/layouts/hooks/use-shell'
import { useIsMobile } from '@/hooks/ui/use-mobile'
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
