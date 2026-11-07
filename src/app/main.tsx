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
  .catch(error => {
    console.error('[MineAdmin] Application bootstrap failed', error)
    const element = document.getElementById('app')
    if (!element) return
    const screen = document.createElement('div')
    screen.className = 'app-boot-screen'
    screen.setAttribute('role', 'alert')
    const content = document.createElement('div')
    content.className = 'app-boot-content'
    const message = document.createElement('p')
    message.className = 'app-boot-title'
    message.textContent = '应用初始化失败，请刷新重试。'
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.className = 'app-boot-retry'
    retry.textContent = '刷新重试'
    retry.addEventListener('click', () => window.location.reload())
    content.append(message, retry)
    screen.append(content)
    element.replaceChildren(screen)
  })
