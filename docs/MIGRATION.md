# 框架入口迁移

本文件维护当前公开契约和应用源码迁移方式。下表中的旧源码入口已经删除，迁移时应更新调用方，不再依赖兼容转发文件。运行中的后端菜单 ID/URL 兼容单独治理，不因源码移动而直接删除。

| 已删除的旧入口 | 当前入口 | 迁移要求 |
| --- | --- | --- |
| `src/main.tsx`、`src/App.tsx`、`src/bootstrap.tsx` | `src/app/*` | HTML 直接使用 app/main.tsx |
| `@/components/ui/*` | `@/components/reui/primitives/*` | 使用同一个原语实现和 Context |
| `@/components/common/toast*`、`use-toast` | `@/components/reui/toast*`、`use-toast` | 统一 ToastProvider 与消费者 |
| `common/ma-icon`、`common/icon-picker` | `@/components/ma-icon`、`@/components/ma-icon-picker` | 独立公共组件入口 |
| `common/ConfirmDialog` | `@/components/reui/confirm-dialog` | 通用确认框 |
| `components/shared/*` | `@/components/reui/utils/*` | 组件内部共享辅助 |
| `@/i18n` | `@/provider/i18n` | 语言状态、翻译 Hook 和注册统一 |
| `@/lib/utils`、`@/lib/icons` | `@/utils/cn`、`@/utils/icons` | 工具按职责命名 |
| `@/iconify/data.json` | `@/assets/icons/catalog.json` | 保留索引内容和许可元数据 |
| `@/hooks/useCache` | `@/services/storage/cache` | 无 React 状态的工具不是 Hook |
| `@/hooks/usePermission` | `@/hooks/framework/use-permission` | 外部函数保留权限判断语义 |
| 根级 `use-mobile`、`use-file-upload`、`useMessage` | `@/hooks/framework/*` | 分别为 use-mobile、use-file-upload、use-message |
| `@/utils/http` | `@/provider/http` | 应用实例装配；纯 HTTP 工厂仍在 services/http |
| `useUserStore` | `useSession` 或 `provider/session` 的 `useSessionStore` | React Framework 优先 Runtime Hook；会话只有 SessionManager 一个所有者 |
| `useMenuStore` | `provider/navigation` 的 `useNavigationStore` | 导航数据与刷新生命周期集中装配 |
| `useRouteStore` | `RouteRegistry` / `useRoute` | 读取 getSnapshot；setMenus/clearMenus 直接更新 Registry |
| 旧私有共享组件 | `app/private/components/*` | 仅业务应用使用，不能从公共 Core 导入 |
| `types/auto-imports.d.ts`、`types/components.d.ts` | 明确 import 与 `src/types` | 删除遗留 Vue 自动导入声明；# 别名指向 src/types |

未使用的旧 useForm/useTable/useDialog、资源选择/水印 Hook、调试组件和演示副本已删除。表单、表格和弹窗使用现有 Ma 组件接口，不新建同名空壳。

仍在使用的 `MinePlugin.install/hooks.setup` 是业务插件迁移桥，公开新插件使用 `PluginDefinition.setup(ctx)`；旧插件返回 disposer 才能清理自行创建的副作用。`registerSectionPane` 的旧应用消费尚在使用，新 Shell 扩展优先 `ctx.registerSlot({ slot: 'shell.pane', ... })`。这些活跃契约不当作无引用代码误删。

旧配置 `pageAnimate`、`enableWatermark`、`watermarkText`、`asideDark`、`showBreadcrumb`、`whiteRoute` 和旧 mainAside/subAside 显示项只作为兼容数据保留，默认 Shell 未消费。tabbar 统一使用一种展示样式。布局实际支持 classic、columns、mixed；未知 ID 回退 classic。

菜单稳定 ID 和只读核查 SQL 见 [菜单迁移表](MENU_MIGRATION.md)。例如 `base/permission/user` 是稳定 ID，旧视图字段只作为精确 alias；没有实际菜单核对证据时保留 alias，未知 ID 不执行路径猜测。

旧 API URL、权限字段和请求响应结构保持兼容。Base 公共 API 通过 Query resource 适配，新模块使用声明式 Query Hooks，旧命令式页面仍按既有交互刷新。账户设置通过可选插槽接入外部能力，保存时保留未知字段。

iframe 默认拒绝所有来源，部署前必须把需要的 origin 同时配置到应用和服务器 CSP；sandbox 不支持 same-origin 权限。应用扩展、语言包和布局注册见 [扩展指南](EXTENSIONS.md)。
