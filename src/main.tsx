import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { bootstrap } from './bootstrap'
import './assets/styles/globals.css'

// 注册自定义二级菜单面板
import './plugins/mine-admin/dictionary/register-pane'
import './modules/base/permission/user/register-pane'
import './modules/marketing/schedule/register-pane'
import './modules/marketing/calendar/register-pane'

bootstrap()
  .then(() => {
    const root = document.getElementById('app')
    if (!root) {
      throw new Error('MineAdmin mount node #app was not found')
    }
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch(error => {
    console.error('MineAdmin-UI start fail', error)
  })
