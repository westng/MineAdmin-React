# 前端目录迁移指南

文档属性：正式开发文档。更新时间：2026-09-28。本文描述当前源码布局与调用方迁移要求；版本发布、部署和业务验收另行记录。

## 两个开源项目

BioTech 与 MineAdmin-React 均为开源项目。BioTech 主仓库收录完整应用、业务模块、插件和共享业务组件；嵌套框架仓库及 `export:public` 提供可复用框架。业务源码被框架清单排除不表示它是私有源码。

## 导入路径

旧入口已移除，工作树内消费者已同步修改。外部扩展或复制的模块应按下表更新；不要恢复旧目录或新增全局转发包。

| 旧位置（相对 src）                                      | 新位置                                                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| app/create-runtime.ts、app/runtime.ts                   | app/runtime/create-runtime.ts、instance.ts                                                |
| app/bootstrap.tsx                                       | app/bootstrap.ts                                                                          |
| app/branding.ts、menu-policy.ts                         | app/config/                                                                               |
| app/application.css、default-styles.css                 | app/styles/application.css、default.css                                                   |
| provider/index.tsx                                      | provider/app-provider.tsx；稳定入口仍为 @/provider                                        |
| provider/runtime/context 中的 AppRuntime                | provider/runtime/types.ts；Context 留在 context.ts                                        |
| provider/query/client、resource                         | services/query/                                                                           |
| provider/query/table-store                              | provider/query/table-adapter                                                              |
| provider/navigation                                     | router/navigation/；create-navigation 更名为 manager                                      |
| provider/settings                                       | store/settings/；create-store、defaults、colors、use-settings                             |
| store/modules 中的 tabs、keep-alive                     | store/tabs/、store/keep-alive/；工厂与订阅 Hook 相邻                                      |
| provider/i18n 的注册、管理和普通翻译函数                | services/i18n/                                                                            |
| provider/i18n 的 React 订阅、hooks/framework/use-locale | hooks/i18n/                                                                               |
| provider/dictionary                                     | services/dictionary/；订阅 Hook 在 hooks/use-dictionary.ts                                |
| provider/dashboard、provider/runtime/branding           | provider/extensions/dashboard、login-page                                                 |
| hooks/framework 中的会话与权限 Hook                     | hooks/auth/                                                                               |
| hooks/framework 中的 Query Hook                         | hooks/query/                                                                              |
| hooks/framework 中的实例 Hook                           | hooks/runtime/                                                                            |
| hooks/framework 中的通用 UI Hook                        | hooks/ui/                                                                                 |
| hooks/framework/use-route                               | hooks/use-route                                                                           |
| hooks/framework/use-permission 的 PermissionGate        | provider/access/permission-gate                                                           |
| hooks/shell                                             | layouts/hooks/                                                                            |
| components/nm-advertiser-select、nm-douyin-user-parser  | components/business/advertiser-select、douyin-user-parser                                 |
| types/global.d.ts                                       | 环境声明到 types/env.d.ts，设置类型到 store/settings/types.ts，路由类型到 router/types.ts |

能力内部引用具体实现；跨能力引用稳定入口。`services` 与纯 Store 不调用 React Hook、不读取 RuntimeContext；Provider 不硬编码业务实现。路由权限规则的输入契约由 `services/auth/access` 声明，路由类型可以消费该契约，服务不反向依赖 router。

## Base 页面与插件

Base 已按 `login/user/role/menu/department` 等直接子模块组织；页面入口统一为 `base/<子模块>/views/index`。例如旧 `base/views/permission/user/index` 应改为 `base/user/views/index`。完整目录见 [Base 模块说明](../src/modules/base/README.md)。已有菜单数据也须更新；运行时不保留旧页面地址别名。

插件能力安装改用 `install(runtime)`，并返回撤销注册的函数；启动调用 `hooks.start` 和 `install`，不调用 `hooks.setup`。表格渲染器与工具栏分别注册到 `runtime.tableCellRenderers` 和 `runtime.proTableToolbars`，全局注册函数只服务独立组件的兼容场景。安装没有默认超时，也没有 `context.signal`，资源释放由插件显式处理。见 [插件接入](ROUTING.md#插件安装与-shell-插槽)。

Toast 使用当前 Provider 内的 `useToast()`，不再从 `use-toast` 导入全局 `toast` 或 `useSonner`。状态方法、通知 ID 及关闭范围见 [Toast 文档](../src/components/reui/toast.md)。

## 调用方需要核对的契约

- 模块 API 从参数取得 Runtime。页面使用 `useRuntimeFactory(createApi)` 绑定当前实例，没有 `useApi` 或默认应用 API 单例这一层。
- 独立调用 `createSettingsStore` 时传入第三个参数 `dashboardPage`。应用工厂已经传入原有默认首页；缓存设置纠正行为保持不变。
- `createTextTranslator(ports, namespace)` 只要求语言注册表的 translate 和当前语言读取接口。React 翻译和语言订阅统一从 `hooks/i18n` 导入。
- MaDictSelect 从组件自己的 `MaDictionaryContext` 读取字典和翻译；AppProviders 已负责注入。独立组件消费者需提供字典与语言的稳定快照及订阅，见 [组件文档](../src/components/ma-dict-select/README.md)。
- 普通 CRUD 直接把资源 list API 交给 MaProTable。函数携带的 `queryOptions` 让表格复用资源 key 和 loader，写操作失效后会刷新活动表格。匿名包装若丢失该属性，会退回普通表格缓存。复杂受控列表继续使用 `useQueryTable`，不再套另一层请求模式适配。

HTTP 响应封装、认证续期、权限组合、SessionManager 的会话版本隔离、Query 请求取消和 Activity 页面保活仍遵循原有行为约定。

## 验证与发布

目录迁移需要覆盖类型检查、组件检查、目录和依赖边界、业务模块结构、框架与应用测试。启动检查使用隔离缓存、空合成存储并阻断网络；它不能替代浏览器或真实后端验收。

框架导出默认读取 HEAD。验证未提交的迁移必须使用 `--working-tree` 和新的临时目标目录，并在导出结果中检查路径与依赖。Git index 仍可能包含尚未提交的旧路径；提交只在用户明确要求后按文件清单处理，不能为了通过 index 检查自行暂存或删除已有改动。

当前职责和稳定入口以 [ARCHITECTURE.md](../ARCHITECTURE.md) 与源码为准。后续新增模块应直接使用新目录。
