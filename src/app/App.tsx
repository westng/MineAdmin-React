import { useEffect } from 'react'
import { AppRouter } from '@/router'
import { useSettingStore } from '@/store/settings/use-settings'
import { AppProviders } from '@/provider/app-provider'
import { runtime } from './runtime/instance'
function Application() {
  const title = useSettingStore(state => state.title)
  useEffect(() => {
    document.title = title || 'MineAdmin'
  }, [title])
  return <AppRouter />
}
export default function App() {
  return (
    <AppProviders runtime={runtime}>
      <Application />
    </AppProviders>
  )
}
