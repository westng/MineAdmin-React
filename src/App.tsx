import { useEffect } from 'react'
import { AppRouter } from '@/router'
import { useSettingStore } from '@/provider/settings'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/common/toast'

export default function App() {
  const title = useSettingStore(state => state.title)

  useEffect(() => {
    document.title = title || import.meta.env.VITE_APP_TITLE
  }, [title])

  return <ToastProvider><ErrorBoundary><AppRouter /></ErrorBoundary></ToastProvider>
}
