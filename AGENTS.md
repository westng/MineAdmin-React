# MineAdmin React Agent Guide

适用于 `/Users/west/BioTech/web` 独立 Git 仓库。所有回复和交流使用中文。前端规则集中维护在本文件；从 BioTech 主仓库处理 `web/` 内容时，还需遵循父目录 [`../AGENTS.md`](../AGENTS.md) 中的通用工作规范和仓库边界。

## 工作范围与安全边界

- 先确认任务范围、关键前提和风险；区分已核实事实、推测和建议。只修改用户要求的范围，保留工作树中与任务无关的改动。
- 不执行 `git add -A`，不回滚他人改动；不执行 `git reset --hard`、`git checkout -- <file>` 等破坏性 Git 命令，除非用户明确要求。
- 默认使用代码、配置、测试和命令行完成检查。需要浏览器、Chrome、网页自动化或 Computer Use 时，先说明用途、目标页面和操作计划，并取得用户明确确认；未确认不得打开、控制或读取页面。
- 完成标准是：实现目标 -> 运行适用验证 -> 检查结果 -> 修复本次改动导致的问题 -> 重新验证 -> 说明剩余风险或未验证项。

## 技术栈与依赖

- 使用 React 19、TypeScript、Vite、React Router、Zustand、Tailwind CSS、ReUI 和 MineAdmin 组件。
- 统一使用 PNPM；遵循 `package.json` 中的 Node 安全基线 `^22.23.4 || ^24.22.1 || >=26.12.1` 和 `pnpm@11.7.0`，项目版本以 `.node-version` 为准。不要混用 npm/yarn 或生成其他 lockfile。
- 优先复用现有模块结构、MineAdmin 组件、`ma-form`、`ma-dict-*`、`useDialog`、`useMessage`、权限工具和自动导入机制；同类页面先查已有实现。
- React 组件使用函数组件和 Hooks，页面与组件按项目现有 `.tsx` / `.ts` 风格；Import 先第三方、后内部模块，内部路径使用现有别名。
- Ma 系列组件遵循 [docs/MA_COMPONENTS.md](docs/MA_COMPONENTS.md)：根目录只保留公共入口与 README，实现、公开类型、状态及 Context 按职责组织；跨组件通过公共入口访问。
- UI 改动保持窄范围、密集、清晰、可扫描；用户点名组件时不顺手重构整页或共享底层组件，避免无必要的营销式 hero、渐变和阴影。

## 源码职责与入口

- `app` 是装配入口；Runtime 工厂和默认实例分别在 `app/runtime/create-runtime.ts`、`instance.ts`，应用配置在 `app/config`，应用样式在 `app/styles`。其他层不导入默认应用单例。
- `services` 放 HTTP、会话、Query、翻译、字典等非组件实现，不调用 React Hook，不依赖 Provider、页面或组件。TanStack 的 QueryClient/QueryObserver 等非组件 API 可以使用。
- `provider` 负责 React 接入、组件端口适配、权限显示组件、插件宿主和扩展注册；Runtime 类型在 `provider/runtime/types.ts`，不能硬编码业务模块。
- `store/settings`、`store/tabs`、`store/keep-alive` 各自集中纯工厂、类型与订阅 Hook。纯工厂不导入路由、装配层或 Hook；默认首页配置由装配层传入。
- `hooks` 按 auth/query/runtime/i18n/ui 分组，布局 Hook 在 `layouts/hooks`，状态订阅 Hook 跟随 Store；不恢复 `hooks/framework`、`hooks/shell` 或 `store/modules`。
- 跨业务共享组件在 `components/business`。Ma/ReUI 组件通过自己声明的上下文或参数接收应用能力，不能绕过组件闭包检查直接消费应用 Hook。业务组件和通用组件均可开源，职责分区不表示私有范围。
- 普通 CRUD 使用模块 `createApi(runtime)`、页面 `useRuntimeFactory` 和 MaProTable 请求模式。资源 list API 携带的 `queryOptions` 必须直接传递，保证表格与资源写入操作共用缓存键和失效范围；只有复杂查询组合才按需增加 Hook。
- 类型跟随能力：设置在 `store/settings/types.ts`、路由在 `router/types.ts`；`types` 只保留 `api.ts` 和 `env.d.ts`。详细契约见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 业务模块结构

前端业务子模块通常位于 `src/modules/<module>/<submodule>/`，统一采用以下目录标准：

```text
<sub-module>/
├── index.ts             # 跨子模块复用的显式公共入口，按需创建
├── api/                 # 当前子模块的接口与数据类型
├── locales/             # 当前子模块使用的多语言资源
├── hooks/               # 当前子模块的状态或生命周期 Hook，按需创建
├── register-*.ts        # 当前子模块的全局注册，按需创建
└── views/
    ├── components/      # 页面专属组件
    ├── data/            # 页面静态配置或数据转换，按需创建
    └── index.tsx        # 页面入口
```

`index.ts` 仅导出有跨子模块调用方的稳定契约；跨模块不要直接导入 `views/components`、`views/data`。页面入口可用于路由或页面组合。

`hooks/` 按需创建，不属于子模块固定结构。只有存在明确的跨组件状态、生命周期或可复用副作用时才创建 `hooks/`；纯 API 调用、数据转换和一次性页面逻辑不得为凑目录抽成 Hook。数据转换放在 `views/data/`，页面配置和页面专属组件分别放在 `views/data/` 与 `views/components/`，不得在子模块下新增 `utils/` 或其他未登记的固定目录。

## 验证规则

前端验证按实际修改范围选择；仅使用 `MaForm`、`MaProTable` 等组件，不等于修改基础组件。

- 业务页面局部改动：涉及 TypeScript 时运行 `pnpm run typecheck`；ESLint 和 Prettier 默认只检查本次修改的文件，不扫描或修复无关文件。
- 修改共享验证配置、大范围跨模块改动，或用户明确要求时，再运行全量 `pnpm run lint` / `pnpm run format:check`。
- 目录和职责迁移还需验证 `check:boundaries`、`check:application-boundaries`、`check:modules`，并同步源码消费者、测试入口、框架导出清单、样式扫描、README 和架构文档。验证包含 Git 忽略的业务模块与插件。
- 修改 `src/components/ma-*` 的实现、公共类型或行为契约时，运行 `pnpm run check:ma`；只修改其测试时运行 `pnpm run test:ma`。`check:ma` 已包含组件类型检查、Lint 和测试，同一版本代码通过后不重复执行其中的子检查；后续有相关改动或新失败时再验证。
- 不要默认运行完整 `pnpm run build`；涉及 Vite 配置、依赖、路由入口、构建产物或生产行为，或用户明确要求时再运行。

常用命令（文件路径替换为本次修改文件）：

```bash
pnpm run typecheck
pnpm exec eslint <文件路径...> --max-warnings=0
pnpm exec prettier --check <文件路径...>
```

## 仓库边界

- 本目录是 `westng/MineAdmin-React` 独立仓库，提交和推送只处理本仓库中明确属于本次任务的文件。
- BioTech 与 MineAdmin-React 均为开源项目。BioTech 主仓库包含完整应用和业务源码；本仓库及 `export:public` 只分发可复用框架。未进入框架导出清单不代表源码私有。
- BioTech 主仓库的业务前端模块可能位于 `src/modules` 或 `src/plugins`；从主仓库工作时，按照父目录 `AGENTS.md` 的收录与推送边界核对文件，不把两个 Git 仓库混淆。
