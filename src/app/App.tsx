import { useEffect } from 'react'
import type { Location } from 'react-router-dom'
import { AppRouter } from '@/router'
import { useSettingStore } from '@/provider/settings'
import { AppProviders } from '@/provider'
import { runtime } from './runtime'
import { usePluginStore } from '@/provider/plugins'

function onNavigate(location: Location, previous: Location) {
  void usePluginStore.getState().callHooks('routerRedirect', { oldRoute: previous, newRoute: location }, { location })
}
export default function App() {
  const title = useSettingStore(state => state.title)
  useEffect(() => {
    document.title = title || import.meta.env.VITE_APP_TITLE || 'MineAdmin'
  }, [title])
  return (
    <AppProviders runtime={runtime}>
      <AppRouter onNavigate={onNavigate} />
    </AppProviders>
  )
}
