<p align="center">
  <img src="https://avatars.githubusercontent.com/u/277389313?s=200&v=4" width="128" height="128" alt="westng">
</p>

<h1 align="center">MineAdmin React</h1>

<p align="center">
  whalesky-labs 组织维护的 MineAdmin 3.2 React 前端
</p>

<p align="center">
  基于 React 19、TypeScript 和 ReUI，提供认证权限、动态路由、布局扩展与业务组件能力
</p>

<p align="center">
  <a href="https://github.com/westng/MineAdmin-React/actions/workflows/ma-components.yml"><img src="https://github.com/westng/MineAdmin-React/actions/workflows/ma-components.yml/badge.svg" alt="Public framework checks"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React 19"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/pnpm-11.7.0-F69220?logo=pnpm&logoColor=white" alt="pnpm 11.7.0"></a>
</p>

<p align="center">
  中文默认
</p>

基于 React 19、TypeScript 和 ReUI 的后台管理前端，适配 MineAdmin 3.2 后端。提供认证与权限、动态菜单、可扩展布局、表单表格组件和插件接口，支持在统一框架中组织业务模块。

[快速开始](#快速开始) · [架构说明](ARCHITECTURE.md) · [扩展开发](docs/EXTENSIONS.md) · [导航与菜单](docs/MENU_MIGRATION.md) · [升级迁移](docs/MIGRATION.md)

## 项目介绍

本仓库是 `westng/MineAdmin-React` 的 React 实现。MineAdmin 上游的前端文档以 Vue 为主；后端生态和产品介绍可参考 [MineAdmin 官方文档](https://doc.mineadmin.com/)，本仓库的安装命令、组件 API 和扩展方式以这里的源码与文档为准。

项目以应用源码模板交付，当前不发布独立 npm SDK。认证、菜单和业务数据需要连接后端；前端权限控制不能替代服务端授权。

### 主要能力

| 能力       | 当前实现                                                                         |
| ---------- | -------------------------------------------------------------------------------- |
| 认证与权限 | 会话恢复、Token 刷新、账号切换隔离，以及路由和组件访问控制                       |
| 动态路由   | Route Registry 汇合静态路由、后端菜单和插件路由，Component Manifest 解析页面组件 |
| 页面布局   | 经典布局、分栏导航、混合导航三种布局；当前开放经典布局和分栏导航                 |
| 业务组件   | MaForm、MaSearch、MaTable、MaProTable、MaDialog、MaDrawer                        |
| UI 与主题  | ReUI、shadcn/ui 风格原语、Tailwind CSS、明暗主题和主题色                         |
| 数据访问   | Axios 请求层、TanStack Query 缓存，以及按会话隔离的请求生命周期                  |
| 应用扩展   | 插件能力注册、Dashboard 区域、登录方式、工具栏和 Shell 插槽                      |
| 国际化     | 语言包注册与回退，默认提供 zh_CN、zh_TW、en_US；覆盖范围以各模块语言包为准       |

### 布局与二级菜单扩展

布局注册表使用三个固定名称：`经典布局`（`classic`）、`分栏导航`（`columns`）和`混合导航`（`mixed`）。当前账号设置开放前两种布局；`mixed` 保留为未启用实现。历史配置中的 `verve` 会兼容解析为 `columns`。

分栏导航由左侧一级菜单和按当前一级菜单显示的二级菜单组成。二级菜单下方预留 `shell.section.content` 插槽，扩展可以放置业务快捷入口、统计信息或其他自定义内容。插槽占据剩余高度、独立滚动，并在二级菜单折叠时同步隐藏；没有注册内容时保持空白。组件会收到 `sectionPath`、`sectionLabel` 和当前 `pathname`，详细注册方式见[扩展开发](docs/EXTENSIONS.md)。

分栏导航的一级菜单图标在桌面端提供 Tooltip。面包屑位于顶部导航栏，使用实际路由层级；右侧内容区域不再重复显示面包屑，也不添加固定的 `CRM` 层级。个人资料和账号设置统一从头像菜单进入。

### 头像菜单、通知与账号偏好

经典布局和分栏导航复用同一套头像菜单，提供个人资料、账号设置、通知、明暗主题、主题色和退出登录。两种布局的顶部通知按钮及头像菜单入口打开同一个 `MaDrawer`；通知正文由 `notifications` 插槽注入，未注册时显示“暂无通知”。通知数据和业务操作由应用或插件实现，注册示例见[扩展开发](docs/EXTENSIONS.md)。

账号设置保存主题模式、主题色、布局和多设备登录偏好，并保留服务端配置中的其他字段。主题和配色可即时预览，布局在保存成功后切换；保存失败保留当前草稿。存在未保存修改时，页面跳转提供继续编辑、放弃修改和保存后离开的选择，刷新或关闭页面触发浏览器离开提醒。重新加载账号资料时优先恢复服务端主题色，旧配置未提供主题色时兼容本地缓存。

### 技术栈

| 分类       | 依赖                                                |
| ---------- | --------------------------------------------------- |
| 应用       | React 19、TypeScript 5、Vite 8、React Router 7      |
| 状态与数据 | Zustand 5、TanStack Query 5、Axios、Zod             |
| 样式与组件 | Tailwind CSS 4、ReUI、Base UI、Lucide、Ma 组件      |
| 工程检查   | PNPM、ESLint、Prettier、Node Test Runner、Happy DOM |

具体版本以 [package.json](package.json) 和 [pnpm-lock.yaml](pnpm-lock.yaml) 为准。

## 快速开始

### 环境准备

项目声明 Node.js `>=22.13.0`，CI 使用 Node.js 22，包管理器固定为 `pnpm@11.7.0`。使用配套 MineAdmin 后端的实际账号登录；本仓库不创建默认账号或数据库。

独立获取前端：

```bash
git clone https://github.com/westng/MineAdmin-React.git
cd MineAdmin-React
```

如果已经在完整应用仓库中开发，进入它的 `web/` 目录即可。以下命令均在前端根目录执行。

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile

# 仅首次创建，不覆盖已有本地配置。
test -f .env.development.local || cp .env.example .env.development.local
pnpm run dev
```

修改 `.env.development.local`，将后端地址设置为你的开发环境。示例端口是 `2777`，后端地址是 `http://127.0.0.1:9601`；Vite 使用严格端口模式，端口被占用会报错。启动日志给出实际访问地址，配置修改后需要重启开发服务器。

开发服务器会自动打开页面；只想启动服务时可使用 `pnpm exec vite --open false`。前端不会自动启动后端。

### 环境配置

| 变量                      | `.env.example` 示例值   | 用途                                    |
| ------------------------- | ----------------------- | --------------------------------------- |
| `VITE_APP_TITLE`          | `MineAdmin`             | 应用默认标题                            |
| `VITE_APP_PORT`           | `2777`                  | 开发服务器端口                          |
| `VITE_APP_ROOT_BASE`      | `/`                     | Vite 资源根路径                         |
| `VITE_APP_ROUTE_MODE`     | `hash`                  | 路由模式：`hash` 或 `history`           |
| `VITE_OPEN_PROXY`         | `true`                  | HTTP 客户端使用代理前缀还是后端地址     |
| `VITE_PROXY_PREFIX`       | `/dev`                  | 代理模式下的 API 请求前缀               |
| `VITE_APP_API_BASEURL`    | `http://127.0.0.1:9601` | 开发代理目标；非代理模式下的 API 基地址 |
| `VITE_APP_STORAGE_PREFIX` | `mine_`                 | 本地存储命名空间前缀                    |
| `VITE_BUILD_SOURCEMAP`    | `false`                 | 是否生成构建 sourcemap                  |
| `VITE_IFRAME_ORIGINS`     | 空                      | 允许嵌入的精确 origin，以逗号分隔       |

`VITE_OPEN_PROXY=true` 时，请求发往 `VITE_PROXY_PREFIX`。开发服务器将该前缀转发给后端并移除前缀；`false` 时，客户端直接使用 `VITE_APP_API_BASEURL`。目前 Vite 代理表仍会创建，开关主要决定客户端选用的 API 地址，不能把它当作服务端访问控制。

`VITE_` 配置会进入浏览器代码。只填写可公开的配置，账号密码和服务端密钥不要放进这些变量。本地环境文件不提交到 Git。

## 目录说明

```text
src/
├── app/                 # 入口、启动装配、运行时和应用适配器
├── assets/              # 图片、图标索引、全局样式
├── components/
│   ├── ma-*/            # 业务基础组件
│   └── reui/            # ReUI 组件、primitives 原语和内部辅助
├── hooks/
│   ├── framework/       # 会话、权限、路由、Query 等框架 Hook
│   └── shell/           # 布局 Hook
├── layouts/             # 布局、导航、标签页和 Shell 插槽
├── modules/base/        # 登录、用户、角色、菜单、部门等基础功能
├── provider/            # React Provider 和默认应用服务装配
├── router/              # Route Registry、Component Manifest、访问策略
├── services/            # 会话、HTTP、存储、注册表等底层服务
├── store/               # 标签页、页面缓存等状态
├── types/               # 共享类型
└── utils/               # 通用工具
```

业务应用可增加 `src/modules/<业务模块>/`、`src/plugins/` 和可选的 `src/app/application.tsx`、`application.css`。公共模板导出清单不包含这些私有应用入口。完整依赖关系见 [架构说明](ARCHITECTURE.md)，接入示例见 [扩展开发](docs/EXTENSIONS.md)。

### 组件文档

[MaForm](src/components/ma-form/README.md) · [MaSearch](src/components/ma-search/README.md) · [MaTable](src/components/ma-table/README.md) · [MaProTable](src/components/ma-pro-table/README.md) · [MaDialog](src/components/ma-dialog/README.md) · [MaDrawer](src/components/ma-drawer/README.md) · [ReUI](src/components/reui/README.md)

通用 UI 原语位于 `src/components/reui/primitives/`，[components.json](components.json) 中的 shadcn 配置也指向这个目录。业务页面优先复用已有 Ma 组件。

## 开发检查

| 命令                                      | 作用                                               |
| ----------------------------------------- | -------------------------------------------------- |
| `pnpm run dev`                            | 启动开发服务器                                     |
| `pnpm run check`                          | 依次运行 TypeScript、ESLint、Prettier              |
| `pnpm run typecheck`                      | 项目 TypeScript 检查                               |
| `pnpm run lint` / `pnpm run format:check` | 全量 Lint / 配置范围内的格式检查                   |
| `pnpm run check:ma`                       | 组件类型检查、Ma Lint、Ma 行为测试                 |
| `pnpm run check:boundaries`               | 物理目录、公共组件依赖闭包、Core 依赖检查          |
| `pnpm run test:framework`                 | 框架 DOM、路由、会话、边界及 Dashboard 测试        |
| `pnpm run check:framework`                | `check:boundaries` + `check:ma` + `test:framework` |
| `pnpm run check:bootstrap`                | 使用合成存储并阻断网络的启动装配检查               |
| `pnpm run build`                          | TypeScript 检查和生产构建，默认输出到 `dist/`      |
| `pnpm run serve`                          | 使用 http-server 打开已生成的 `dist/`              |
| `pnpm run check:public-index`             | 检查 Git 已跟踪内容是否符合公共发布清单            |
| `pnpm run build:public-smoke`             | 在临时目录中对公共源码执行类型检查和构建           |
| `pnpm run export:public`                  | 导出公共源码与 SHA-256 文件清单                    |

独立 Git 仓库安装依赖时会配置 `.githooks`；提交和推送均运行 `pnpm run check`。CI 的完整配置见 [工作流](.github/workflows/ma-components.yml)，它还包括框架、启动、公共构建、发布边界和依赖检查。

局部修改可先对指定文件执行 ESLint 和 Prettier。Markdown 被现有 `.prettierignore` 排除，检查文档时需显式覆盖忽略规则，例如：

```bash
pnpm exec prettier --ignore-path /dev/null --check README.md ARCHITECTURE.md docs/*.md
```

静态检查、模拟 DOM、生产构建和浏览器联调分别验证不同内容。提交时说明实际执行的检查及失败项，不把配置了 CI 等同于 CI 已通过。

## 构建与部署

### API 与路由

开发用 `.env.development.local` 不会自动成为生产配置。构建前准备 `.env.production.local`，选择一种 API 方式：

- **同域反向代理**：设置 `VITE_OPEN_PROXY=true` 和所需 `VITE_PROXY_PREFIX`，由部署服务器把该路径转发给后端。
- **直接请求 API**：设置 `VITE_OPEN_PROXY=false` 和正式的 `VITE_APP_API_BASEURL`，后端按部署域名配置 CORS。

Vite 开发代理不会打包进 `dist/`。生产环境不能依赖开发服务器转发，也不要把示例的本机后端地址直接用于线上配置。

```bash
pnpm run build
pnpm run serve
```

`serve` 仅启动静态文件服务，不配置后端代理、TLS 或 history 路由回退。hash 模式无需按前端路由配置回退；history 模式必须将页面深链接回退到 `index.html`，同时保留 API 和静态资源的独立处理。子目录部署需同时核对资源路径和路由配置，不能只改 `VITE_APP_ROOT_BASE` 就认为所有深链接均已适配。

### iframe 与静态资源

iframe 默认不允许任何外部来源。`VITE_IFRAME_ORIGINS` 接受如 `https://example.com` 的精确 origin，不能带页面路径或任意通配符。构建会把对应 `frame-src` 注入 HTML CSP；服务器若也设置 CSP，两处策略需要兼容。iframe 使用受限 sandbox，不启用 `allow-same-origin`。

构建不会自动生成 gzip/Brotli 归档；压缩与缓存策略由部署服务器决定。`VITE_BUILD_SOURCEMAP` 控制 sourcemap 生成。

## 公共源码与应用源码

[scripts/public-files.mjs](scripts/public-files.mjs) 定义公共源码导出白名单：包含框架、Ma/ReUI、`modules/base`、示例和指定文档；排除私有插件、业务模块和应用适配器。

```bash
pnpm run check:public-index
# 目标路径必须尚不存在；省略参数时使用 dist-source/。
pnpm run export:public -- /absolute/path/to/new-source-directory
```

导出会生成 `SOURCE_MANIFEST.json`，记录各文件的 SHA-256；不会提交、推送或修改 Git index。`.gitignore` 不会自动取消跟踪历史文件，因此“本地被忽略”“Git 已跟踪”“公共导出包含”需要分别核对。发布边界失败时应先审查具体路径，不能用强制添加私有源码来让依赖暂时可用。

## 参与开发

修改前查阅对应组件或模块文档；新增页面遵循现有模块结构，菜单变更同步维护组件标识。提交说明写清楚功能变化与验证结果。提交问题时附上版本、复现步骤、脱敏错误和预期行为，不附带真实凭据或业务数据。

## 参考与许可

- [MineAdmin 官方仓库](https://github.com/mineadmin/MineAdmin)：后端项目与上游说明。
- [MineAdmin 官方文档](https://doc.mineadmin.com/)：产品介绍和后端开发参考。
- [React](https://react.dev/)、[Vite](https://vite.dev/)、[ReUI](https://reui.io/)、[shadcn/ui](https://ui.shadcn.com/)：上游技术文档。

本项目自有代码采用 [MIT License](LICENSE)。上游及第三方来源仍受其各自许可证约束，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
