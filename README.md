# MineAdmin-React

MineAdmin 3.2 的 React 前端，使用 React 19、Vite、TypeScript、Tailwind CSS、Zustand 和 ReUI 构建。

## 快速开始

环境要求：Node.js `>=20.19.0`，pnpm `11.7.0`。

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

开发服务器默认监听 `http://127.0.0.1:2777`。开发环境请求通过 `/dev` 代理到 MineAdmin 后端 `http://127.0.0.1:9601`；请先从父仓库启动后端服务。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm run dev` | 启动 Vite 开发服务器 |
| `pnpm run typecheck` | 执行 TypeScript 项目检查 |
| `pnpm run lint` | 执行 ESLint 严格检查 |
| `pnpm run build` | 类型检查并构建生产包到 `dist/` |
| `pnpm run serve` | 使用静态服务器预览 `dist/` |

## 环境配置

- `.env.development` 使用 `2777` 端口、Hash 路由和 `/dev` API 代理。
- `.env.production` 将 API 目标设置为容器内的 `http://hyperf:9601`，生产构建默认输出 gzip 和 Brotli 压缩配置。
- `VITE_APP_API_BASEURL`、`VITE_PROXY_PREFIX` 和 `VITE_OPEN_PROXY` 控制请求目标；环境文件属于本地配置，不要提交密钥或覆盖用户现有值。

## 目录与架构

```text
src/
├── components/
│   ├── reui/           # ReUI registry 原始组件
│   ├── ui/             # shadcn/Base UI 基础组件
│   ├── common/         # 项目级通用封装，例如 Toast
│   └── ma-*/           # MineAdmin 通用表单、搜索、表格组件
├── layouts/            # 应用布局、导航、账户中心布局
├── modules/base/       # 已纳入仓库的基础业务模块
├── plugins/            # 本地插件扩展目录
├── provider/           # 设置、字典、插件注册和生命周期
├── router/             # 静态路由、动态菜单和插件路由
├── store/              # 用户、菜单、路由、标签页和 KeepAlive 状态
└── utils/              # HTTP、权限、资源和 API 响应辅助函数
```

### 基础组件

- `MaForm` 负责字段模型与校验，`MaSearch` 负责搜索交互，`MaTable` 负责表格展示，`MaProTable` 组合搜索、请求、响应解析和表格。
- 每个 `ma-*` 目录通过 `index.ts` 暴露公开组件和类型；公开接口放在 `types/`，渲染和状态逻辑放在 `components/`，辅助逻辑放在 `utils/`。
- `MaDialog`、`MaDrawer` 和 Toast 是项目级封装；业务页面只组合这些封装，不修改 `components/reui` 或 `components/ui` 的原始源码。

### 业务模块

`src/modules/base` 按业务子模块维护 `api/`、`locales/`、`views/` 和按需创建的注册文件。新增业务使用以下结构，并将页面专属组件放到对应 `views/components/`：

```text
src/modules/<业务域>/<业务子类>/
├── api/
├── locales/
├── register-*.ts
└── views/
    ├── components/
    ├── data/
    └── index.tsx
```

尚未迁移为 React 页面组件的 Vue 版视图由动态菜单占位页承接；页面路由、权限和菜单仍由后端返回的数据驱动。

### Base 菜单视图迁移（重要）

Base 页面已从旧的 Vue 目录约定迁移为 React 目录约定。后端 `menu.component` 保存的是视图地址；如果继续使用旧地址，菜单可能进入动态菜单占位页，新增或未迁移页面也不会自动兼容。

- 旧地址到新地址的精确映射见 [`scripts/migrate-base-menu-components.sql`](./scripts/migrate-base-menu-components.sql)。执行前请备份 `menu` 表，并先运行脚本中的查询确认命中记录；建议在数据库事务中执行更新语句。
- 脚本只修改已经有 React 页面实现的 11 个 Base 菜单地址，重复执行不会改动已迁移地址；`meta` 中的 Vue 配置会原样保留。
- 当前前端保留旧地址兼容别名作为过渡措施，不代表所有旧页面都可用。`base/views/log/userLogin`、`base/views/log/userOperation` 和 `base/views/dataCenter/attachment/index` 在当前 React 前端没有对应页面，请按业务需要接入插件或继续使用原 Vue 页面。
- 更新后重新登录或刷新菜单缓存，并检查最后一条查询返回的 `base/views/%` 记录；仍有记录表示需要人工迁移，不能直接删除菜单。

### 插件系统

插件入口位于 `src/plugins/<vendor>/<name>/index.ts`，可以注册视图、字典、安装逻辑和生命周期钩子。插件启动时会按 `config.enable` 和 `config.info` 合并配置，再依次执行安装和初始化；网络请求与路由跳转也会触发对应钩子。

## 仓库边界

- 当前 Git 仓库只跟踪 `src/modules/base` 以及公共组件、布局、Provider 和基础设施代码。
- `src/plugins/` 与 `src/modules/` 下除 `base` 以外的业务目录由 `.gitignore` 忽略，作为本地业务扩展保留；要把某个插件或业务模块发布到仓库，需先明确调整忽略规则并单独审核其依赖。
- `node_modules/`、`dist/`、`.env.*` 和构建临时文件不纳入提交。

## 开发约定

- ReUI 组件通过 `components.json` 中的 `@reui` registry 安装；不要新增未经 registry 提供的替代组件或第二套 UI primitive。
- 请求统一经过 `src/utils/http.ts`，由现有认证、刷新 Token、语言和插件网络钩子链路处理。
- 操作成功、失败、校验和筛选重置等短反馈使用 `src/components/common/toast.tsx`；持续上下文信息才使用 Alert。
- 图表使用已安装的 Recharts；不要另行引入 ECharts 运行时。

## 验证

提交前至少运行：

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
```
