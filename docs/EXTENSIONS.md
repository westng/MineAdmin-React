# 应用与插件扩展

在应用本地创建 `src/app/application.tsx`，导出 `setupApplication(runtime)` 并返回撤销函数。模板构建在该文件不存在时使用默认空适配器。不要在公共 `main.tsx` 中添加业务 import。

```tsx
import type { AppRuntime } from '@/provider/runtime/context'
import { helloPlugin } from '../../examples/plugins/hello'

export async function setupApplication(runtime: AppRuntime) {
  await runtime.plugins.enable(helloPlugin)
  return () => runtime.plugins.disable(helloPlugin.manifest.id)
}
```

插件是构建期可信代码。Manifest 的 `coreApi: 1` 表示公开协议主版本，插件自身 version 使用语义化版本。`capabilities` 决定可用注册方法；未经声明的能力拒绝使用。所有注册方法返回 disposer，Host 会自动管理这些 disposer。独立订阅、事件和定时器要调用 `ctx.onDispose()`；异步任务消费 `ctx.signal`。插件失败不会自动重试，修正后显式重新启用。

语言包格式为 `default { namespace, messages }`，其中 messages 以语言编码分组。Core 自动发现 Base 的 `**/locales/*.ts` 与 Shell 的 `locales/*.ts`；应用模块由组合根提供 glob 结果给 `registerLocaleBundles`，插件也可调用 `registerLocale`。同一 key 不允许静默覆盖。

Dashboard 业务通过 `registerDashboardSlot({ id, slot, order, render })` 接入，应用卸载时调用返回的 disposer；无注册时首页为空壳。业务数据通过 Query Hook 获取，组件不要向框架 Slot 注册表写入数据缓存。

Shell slot 支持 `shell.toolbar`、`shell.overlays`、`shell.pane`、`shell.section.content`、`auth.methods`、`account.preferences`、`account.bindings`、`settings.extensions` 和 `notifications`。Context 给扩展传入 pathname、userId、disabled 等公共参数。

`shell.section.content` 位于分栏导航的二级菜单下方，占据剩余高度并独立滚动，随二级侧栏一起折叠；无二级菜单时不挂载，无注册内容时保持空白。组件额外接收 `sectionPath`、`sectionLabel`，表示当前点击选中的一级菜单；点击一级菜单未跳转页面时，`pathname` 仍是原页面地址。需要按一级菜单显示内容时，在组件中判断 `sectionPath`；注册项的 `match` 仍只匹配页面地址。

```tsx
import { registerShellSlot } from '@/layouts/slots'
import { AnnualSidebar } from './components/annual-sidebar'

const dispose = registerShellSlot({
  id: 'my-app.annual-sidebar',
  slot: 'shell.section.content',
  component: ({ sectionPath }) => (sectionPath === '/annual' ? <AnnualSidebar /> : null),
})
// 应用或插件卸载时调用 dispose()；插件也可使用 ctx.registerSlot() 注册。
```

登录页只在“其他登录方式”区域提供 `auth.methods` 插槽。开发者注册自己的快捷方式组件，应用也使用同一入口；无需复制或替换登录页。组件可自行管理授权弹窗和回调，并使用 `useSession(state => state.loginWithTokens)` 接入公共会话。该区域位于表单内，快捷按钮应设置 `type="button"` 并尊重传入的 `disabled`。

```tsx
import { registerShellSlot } from '@/layouts/slots'
import { MyLoginShortcut } from './components/my-login-shortcut'

const dispose = registerShellSlot({
  id: 'my-app.login',
  slot: 'auth.methods',
  component: MyLoginShortcut,
})
// 应用或插件卸载时调用 dispose()。
```

经典布局和分栏导航的顶部通知按钮及头像菜单入口共用一个 `MaDrawer`，正文通过 `notifications` 插槽注入。插槽组件接收当前 `pathname` 和 `userId`；未注册内容时显示“暂无通知”。通知数据与读取、标记已读等行为由注入组件负责。抽屉沿用 `MaDrawer` 的默认宽度、边距和关闭行为，不显示底部操作栏；注入组件只需提供正文。

```tsx
import { registerShellSlot } from '@/layouts/slots'
import { MyNotifications } from './components/my-notifications'

const dispose = registerShellSlot({
  id: 'my-app.notifications',
  slot: 'notifications',
  component: ({ pathname, userId }) => <MyNotifications pathname={pathname} userId={userId} />,
})
// 应用卸载时调用 dispose()；插件可使用 ctx.registerSlot() 自动管理生命周期。
```

Shell 内的自定义入口可通过 `useShell()`（`@/hooks/shell/use-shell`）读取 `notificationsOpen` 或调用 `setNotificationsOpen(true)`，无需重复挂载通知抽屉。经典布局和分栏导航也复用 `ProfileMenu`（`@/layouts/components/profile-menu`）；分栏导航使用紧凑头像入口，进入个人资料或账号设置时清除当前二级菜单。

账号设置将内置偏好合并保存到当前用户的 `backend_setting.app` 和 `backend_setting.account`，保留已有扩展字段。主题和配色即时预览，布局先保留为草稿、保存成功后应用；离开提醒只覆盖这些内置偏好，`account.preferences` 注入组件需自行管理业务字段的保存和离开保护。应用路由使用 React Router 的 Data Router 支持 `useBlocker`，扩展应使用现有路由上下文，不再嵌套独立 Router。

品牌默认值通过 `modules/base/auth/data/website` 的 `registerLoginPageConfig` 配置并在卸载时撤销；在线展示配置仍由既有登录配置接口加载。业务实现和品牌默认值的源码是否导出由发布清单决定。

三种布局都消费相同 ShellContext。注册新布局时提供 navigation，可选 headerNavigation，不创建第二个 Router/QueryClient/Session；`layoutRegistry.register()` 返回 disposer。页面保留在共享的内容 Outlet 中。

`examples/modules/hello.tsx` 展示 Query 的 AbortSignal、会话 key 和加载/错误状态。服务端授权必须由后端执行；插件和界面的 Access 只提供前端可用性控制。

特性文案可以使用 `createTextTranslator(namespace)` 与可读源文案 key；React 组件调用 `useLocaleRevision()` 订阅切换，表格和表单配置的 memo 依赖需包含返回的语言版本。优先使用 `useTranslate()` 消费 `app` namespace 的语义 key。缺失翻译回退 zh_CN，不能用切换页面 key 的方式刷新语言。

应用的发布范围由 `scripts/public-files.mjs` 定义。维护模板发布分支前可执行 `pnpm run export:public -- /absolute/new/directory` 生成只含公共文件与 SHA-256 清单的副本，再核对 `check:public-index`；该导出不提交、不推送，也不会修改当前 Git index。

公共组件只从 Ma/ReUI 入口引用。应用专用组件放在所属业务模块的 components 中，Logo 与等级图标沿用 `assets/images` 的文件命名；不要重新创建 components/ui、common 或 shared 兼容层。语言 Hook 的物理入口为 `provider/i18n`，跨模块 Hook 统一在 hooks/framework 或 hooks/shell。
