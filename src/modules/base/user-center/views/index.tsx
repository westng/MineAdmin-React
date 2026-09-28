import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useSession } from '@/hooks/auth/use-session'
import { ProfileForm } from './components/profile-form'

export default function UserCenterPage() {
  const tx = useTextTranslator('base.user-center.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

  const userInfo = useSession(state => state.userInfo)
  const setUserInfo = useSession(state => state.setUserInfo)

  if (!userInfo) {
    return <div className="w-full py-12 text-center text-sm text-muted-foreground">{tx('正在加载个人资料…')}</div>
  }

  return (
    <div className="w-full">
      <ProfileForm userInfo={userInfo} onUserInfoChange={setUserInfo} />
    </div>
  )
}
