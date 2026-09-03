import { registerSectionPane } from '@/layouts/components/main-aside/section-pane-registry'
import UserListPane from './UserListPane'

// 为用户管理页面注册自定义二级菜单面板
registerSectionPane({
  section: 'dynamic:/permission/user',
  component: UserListPane,
})
