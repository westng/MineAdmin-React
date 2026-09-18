import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useSession } from '@/hooks/framework/use-session'
import { ProfileForm } from './profile-form'

const tx = createTextTranslator('base.user-center.ui')

export default function UserCenterPage() {
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
