# 路由与页面映射

框架使用 React Router。`dynamic-routes.tsx` 中的 `menuToRoutes` 一次遍历菜单，解析视图、记录祖先权限和面包屑、收集目录目标，并直接生成页面元素。默认静态路由与插件 `views` 使用同一份结果；页面渲染时不再查找原始菜单或视图地址。

## 动态菜单字段

| 字段                 | 含义                     | 示例                         |
| -------------------- | ------------------------ | ---------------------------- |
| `path`               | 浏览器访问地址           | `/reports/orders`            |
| `component`          | 相对视图根目录的页面地址 | `example/report/views/index` |
| `meta.componentPath` | 视图根目录               | `modules/` 或 `plugins/`     |

模块菜单示例：

```json
{
  "name": "example:orders",
  "path": "/reports/orders",
  "component": "example/report/views/index",
  "meta": { "title": "订单", "componentPath": "modules/" }
}
```

它加载 `src/modules/example/report/views/index.tsx`。将目录改为 `plugins/`，则加载 `src/plugins/example/report/views/index.tsx`，且所属插件必须启用。访问 URL 和文件位置互相独立；父菜单只参与相对 URL 拼接及权限继承。

Vite 在构建时发现 `modules/**/views/` 和 `plugins/**/views/` 中的 `.tsx`、`.jsx` 文件，排除 `components`、`data`、`hooks`、`__tests__` 和测试文件。页面默认导出 React 组件。新增页面无需修改框架映射表，生产部署需要重新构建。

新菜单使用不带根目录、不带扩展名的 `component`。已有引用可兼容 `.tsx`、`.jsx`、`.vue` 后缀；`.vue` 仅作为同路径 React 文件的历史标记。明确指定目录后不跨目录查找。未指定目录的历史菜单必须唯一命中，否则需要补充目录。

菜单编辑器检查与运行时使用同一个文件解析器。找不到页面时显示加载失败状态；未知 URL 显示 404。

## 插件静态与动态页面

插件入口为 `src/plugins/<作者>/<目录>/index.ts(x)`，默认导出配置：

```ts
import type { PluginConfig } from '@/provider/plugins/host'

export default {
  config: { enable: true, info: { name: 'Report tools', version: '1.0.0' } },
  views: [
    {
      name: 'example:report:help',
      path: '/report/help',
      component: () => import('./views/help'),
      meta: { title: '报表帮助' },
    },
  ],
} satisfies PluginConfig
```

这里的帮助页是插件静态路由，插件启用后注册，无需后台菜单；默认要求登录，可通过 `meta.permission`、`role`、`user` 等声明访问限制。`info.name` 在应用内唯一，自动发现时使用实际目录判断动态视图的插件归属。

插件动态页面通过后台菜单配置 `component` 和 `meta.componentPath: 'plugins/'`，无需在 `views` 再登记。仅提供动态页面的插件也需要启用的插件入口，其 `views` 可以省略。

同一路径的代码组件与菜单合并时，代码提供页面实现和已经声明的 `redirect`，菜单补充导航信息；所有来源及祖先的权限都须满足。等价路径保留首个代码声明的实现及重定向，同时叠加其他声明的访问条件；默认静态路由先于插件路由。仅包含标题等元数据的菜单不会清空静态跳转目标。`/orders/new` 与 `/orders/:id` 可正常共存。

## 页面行为

- 隐藏菜单保留路由；停用分支和按钮不生成动态路由。根目录、登录保留项和非法菜单地址不再使整张路由表生成失败，其他有效页面仍可初始化。
- 目录可配置内部 `redirect`，或进入第一个有权限且能加载的子页面；跳转保留 query/hash，循环跳转显示失败状态。
- 登录恢复失败可重试。确认凭据失效才退出；账号切换立即清除旧资料、路由和缓存。
- `meta.useDefaultLayout: false` 只关闭默认布局，不取消登录和权限检查。
- `meta.cache: true` 使用 React Activity 保留已打开标签的页面状态，最多保留 8 个页面。关闭标签、权限撤销及会话切换会释放相关页面。
- 外链、iframe 使用 `meta.link`。iframe 仍受应用来源许可和 sandbox 限制。
- `VITE_APP_ROUTE_MODE` 选择 `hash` 或 `history`，`VITE_APP_ROOT_BASE` 由 React Router 处理。history 部署需要服务器把前端页面地址回退到入口 HTML。

## 独立公开源码验证

`examples/routing/` 提供模块页面、插件静态页面、插件动态页面及对应菜单数据。参见其 README。

```sh
pnpm exec node --test tests/framework-routing.test.mjs tests/framework-route-pages.test.mjs tests/framework-public-routing.test.mjs
pnpm run build:public-smoke -- --working-tree
```

公开测试在临时目录中按 MineAdmin-React 框架清单排除 BioTech 应用入口、业务模块、业务插件和本地环境文件，先验证空插件场景，再安装通用示例并检查页面实际渲染。它使用模拟会话和菜单，不修改后台数据。

公开导出默认读取 Git 提交；本地未提交实现用 `--working-tree` 预览。发布前还需核对新增框架文件的 Git 收录状态。

## 核心文件

- `src/router/index.tsx`：Router、登录恢复与导航生命周期。
- `src/router/static-routes.ts`：默认静态页面声明。
- `src/router/dynamic-routes.tsx`：文件查找与菜单转路由。
- `src/router/page-viewport.tsx`：权限、目录跳转、Suspense 与 Activity 缓存。

异步页面加载状态位于 `src/router/async-view.tsx`，首页身份在 `src/router/dashboard.ts`，共享路由类型在 `src/router/types.ts`。菜单状态管理和辅助函数位于 `src/router/navigation/`，权限条件复用 `src/services/auth/access.ts`。

## 插件安装与 Shell 插槽

启动从 `plugins/<作者>/<目录>/index.ts(x)` 自动发现插件，按 `info.order`（默认 0）和目录排序，依次调用 `hooks.start(config)` 与启用插件的 `install(runtime)`，然后执行应用的 `setupApplication(runtime)`。当前启动不调用 `hooks.setup`。安装失败的插件不提供页面；安装过程没有默认超时，插件应自行清理部分失败的资源。

`install` 返回清理函数，用于撤销注册和监听器。应用表格扩展使用 `runtime.tableCellRenderers.register(...)` 和 `runtime.proTableToolbars.register(...)`，不能注册到独立组件的全局兼容入口。

```tsx
import type { PluginConfig } from '@/provider/plugins/host'
import type { ShellSlotProps } from '@/layouts/slots'

function SectionInfo({ sectionLabel }: ShellSlotProps) {
  return <p>{sectionLabel}</p>
}

export default {
  config: { enable: true, info: { name: 'example/section-info', version: '1.0.0' } },
  install: runtime =>
    runtime.slots.register({
      id: 'example.section-info',
      slot: 'shell.section.content',
      component: SectionInfo,
    }),
} satisfies PluginConfig
```

Shell 支持 `shell.overlays`、`shell.toolbar`、`shell.pane`、`shell.section.content`、`auth.methods`、`account.preferences`、`account.bindings`、`settings.extensions` 和 `notifications`。注册项可提供 `order` 和 `match(pathname)`；组件接收的路径、用户、分栏信息随插槽位置而定，完整类型见 `src/layouts/slots.ts`。

分栏导航的 `shell.section.content` 接收 `sectionPath`、`sectionLabel` 和 `pathname`，二级菜单折叠时隐藏。页面自身的顶部操作使用 `useHeaderActions`，由布局提供的上下文管理，见 [工具栏说明](../src/layouts/components/bars/toolbar/README.md)。
