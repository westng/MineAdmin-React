import { useEffect } from 'react'
import { AppRouter } from '@/router'
import { useSettingStore } from '@/provider/settings'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function App() {
  const title = useSettingStore(state => state.title)

  useEffect(() => {
    document.title = title || import.meta.env.VITE_APP_TITLE
  }, [title])

  return <ErrorBoundary><AppRouter /></ErrorBoundary>
}
