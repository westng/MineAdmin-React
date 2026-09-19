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

品牌默认值通过 `modules/base/auth/data/website` 的 `registerLoginPageConfig` 配置并在卸载时撤销；在线展示配置仍由既有登录配置接口加载。业务实现和品牌默认值的源码是否导出由发布清单决定。

三种布局都消费相同 ShellContext。注册新布局时提供 navigation，可选 headerNavigation，不创建第二个 Router/QueryClient/Session；`layoutRegistry.register()` 返回 disposer。页面保留在共享的内容 Outlet 中。

`examples/modules/hello.tsx` 展示 Query 的 AbortSignal、会话 key 和加载/错误状态。服务端授权必须由后端执行；插件和界面的 Access 只提供前端可用性控制。

特性文案可以使用 `createTextTranslator(namespace)` 与可读源文案 key；React 组件调用 `useLocaleRevision()` 订阅切换，表格和表单配置的 memo 依赖需包含返回的语言版本。优先使用 `useTranslate()` 消费 `app` namespace 的语义 key。缺失翻译回退 zh_CN，不能用切换页面 key 的方式刷新语言。

应用的发布范围由 `scripts/public-files.mjs` 定义。维护模板发布分支前可执行 `pnpm run export:public -- /absolute/new/directory` 生成只含公共文件与 SHA-256 清单的副本，再核对 `check:public-index`；该导出不提交、不推送，也不会修改当前 Git index。

公共组件只从 Ma/ReUI 入口引用。应用专用组件放在所属业务模块的 components 中，Logo 与等级图标沿用 `assets/images` 的文件命名；不要重新创建 components/ui、common 或 shared 兼容层。语言 Hook 的物理入口为 `provider/i18n`，跨模块 Hook 统一在 hooks/framework 或 hooks/shell。
