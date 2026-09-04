import { registerSectionPane } from '@/layouts/components/main-aside/section-pane-registry'
import UserListPane from './views/components/UserListPane'

registerSectionPane({
  section: 'dynamic:/permission/user',
  component: UserListPane,
})
