# MineAdmin-React

React 19 + Vite + TypeScript + Tailwind CSS + Zustand + ReUI 的 MineAdmin 前端。

## 开发

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

开发端口为 `2777`，API 通过 `/dev` 代理到后端 `9601`。项目统一使用 `pnpm`，Node.js 要求 `>=20.19.0`。

## 基础架构

- `src/components/ui` 和 `src/components/reui` 只保留官方 registry 组件；业务表单、验证码和页面布局放在 `src/modules` 或 `src/layouts`。
- `src/components/ma-form`、`src/components/ma-search`、`src/components/ma-table`、`src/components/ma-pro-table` 是独立的 MineAdmin 通用组件包；每个目录通过 `index.ts` 暴露组件，通过 `types.ts` 暴露公开接口，业务页面不得修改其内部实现。
- `MaForm` 负责字段模型与校验，`MaSearch` 负责搜索交互，`MaTable` 负责表格展示，`MaProTable` 负责三者之外的查询请求与组合；页面专属列、字段、工具栏和标签页必须留在对应业务模块。
- `src/store/modules` 对应 Vue 版 Pinia 的用户、菜单、运行时路由、标签页和 KeepAlive 状态。
- `src/hooks` 提供缓存、权限、对话框、消息、主题色、水印和资源 URL 等通用能力。
- `src/provider` 提供设置、字典和插件注册；`src/i18n` 提供中英文运行时翻译。
- Vue 版的 ECharts provider 在 React 侧由已安装的 Recharts 组件替代，图表页面只通过组件组合使用，不再引入第二套图表运行时。
- 登录后启动链依次加载 `getInfo`、权限菜单和角色，并生成动态路由；刷新页面会重新初始化，不依赖内存状态。
- `src/modules/base/api` 已按 Vue 版接口补齐认证、权限、用户、角色、组织、日志和附件请求契约；权限管理下的用户、角色、菜单、部门页面已接入真实 CRUD 和授权接口。

Vue 版中尚未迁移为 React 页面组件的业务视图，会由动态菜单安全占位页承接；新增业务页面时只需在对应 `modules/<module>/views` 下实现，并保持基础组件与业务组装分层。

## 检查

```bash
pnpm run typecheck
pnpm run lint
```

# MineAdmin-Recat
