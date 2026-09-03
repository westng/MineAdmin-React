import { useUserStore } from '@/store/modules/useUserStore'
import { ProfileForm } from './components/profile-form'

export default function UserCenterPage() {
  const userInfo = useUserStore(state => state.userInfo)
  const setUserInfo = useUserStore(state => state.setUserInfo)

  if (!userInfo) {
    return <div className="w-full py-12 text-center text-sm text-muted-foreground">正在加载个人资料…</div>
  }

  return (
    <div className="w-full">
      <ProfileForm userInfo={userInfo} onUserInfoChange={setUserInfo} />
    </div>
  )
}
