import { ProfileMenu } from '@/layouts/components/profile-menu'
import { useVerveNavigation } from './navigation-context'

export function VerveProfileMenu() {
  const { clearSection } = useVerveNavigation()
  return <ProfileMenu compact contentClassName="verve-profile" onNavigate={clearSection} />
}
