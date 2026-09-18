import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { bootstrap } from './bootstrap'
import '@/assets/styles/globals.css'
bootstrap()
  .then(dispose => {
    const element = document.getElementById('app')
    if (!element) {
      dispose()
      throw new Error('MineAdmin mount node #app was not found')
    }
    const root = createRoot(element)
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    if (import.meta.hot)
      import.meta.hot.dispose(() => {
        root.unmount()
        dispose()
      })
  })
  .catch(() => {
    const root = document.getElementById('app')
    if (root) root.textContent = '应用初始化失败，请刷新重试。'
  })
