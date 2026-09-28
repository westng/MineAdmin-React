import MainAside from '@/layouts/components/main-aside'
import SectionNavigation from '@/layouts/components/section-navigation'
import { useShell } from '@/layouts/hooks/use-shell'
export function MixedHeaderNavigation() {
  return <SectionNavigation />
}
export default function MixedNavigation() {
  const { activeSection } = useShell()
  return <MainAside menusOverride={activeSection?.children ?? []} />
}
