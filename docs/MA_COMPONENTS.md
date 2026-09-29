# Ma 组件工程规范

本规范适用于 `src/components/ma-*`，以当前源码、公共类型与自动化检查为准。组件使用 React 函数组件和 Hooks，通过参数或显式 Context 接收应用能力。

## 目录与职责

```text
ma-example/
├── index.ts(x)    # 稳定公共入口，只做显式导出
├── README.md      # 用法、公共契约、行为边界与验证说明
├── components/    # 展示组件与组件内部的子视图
├── types/         # 公共类型入口 index.ts；内部类型按需独立
├── hooks/         # 按需：状态、订阅、异步生命周期和交互控制
├── utils/         # 按需：转换、过滤、校验和独立状态工厂
├── context/       # 按需：React Context 与默认接入值
├── data/          # 按需：默认值、目录数据与配置
└── illustrations/ # 按需：插画实现
```

根目录只放公共入口 `index.ts` 或 `index.tsx` 和 `README.md`；每个组件都提供 `components/` 与 `types/index.ts`。其余目录仅在有对应职责时创建，不创建空目录或无实际用途的 Hook。简单展示组件可在组件内保留局部状态，独立请求、订阅和取消流程集中到 Hooks。

- 公共入口（`index.ts` / `index.tsx`）不包含组件实现、类型声明或状态初始化；从职责目录导出稳定 API。公开类型从 `types/` 导出，复用其他 Ma 组件的契约时通过其公共入口转出。
- `types/` 不初始化运行时对象；引用 React 或底层控件的类型使用 `import type`。
- `utils/` 不创建 React Context；例如注册表的纯工厂放在 `utils/`，React 接入和默认实例放在 `context/`。
- `components/` 负责视图组合；能够独立说明职责的子视图可以拆分，不为行数指标机械拆文件。
- `hooks/` 负责有状态行为；请求源切换、去抖、回显、取消与晚到响应处理应保持同一行为契约。

## 公共入口与应用边界

页面、插件、Provider 和其他 Ma 组件统一从 `@/components/ma-example` 导入公共能力。组件内部使用相对路径直接依赖自身实现；避免导入自身公共入口造成循环依赖。白盒测试可以定点读取或导入内部模块。

组件不得直接使用默认应用 Runtime、HTTP 单例或权限 Hook。权限结果、翻译、请求客户端与注册表均由调用方传入或通过声明的 Context 提供；上传、下载、权限和业务请求仍遵循应用已有流程。

新增目录、迁移或拆分时，同步公共导出、消费者（包括 Git 忽略的业务模块与插件）、类型检查、测试、文档和框架导出范围。保持现有公共属性和行为，避免以结构调整为由修改业务语义。

## 验证与防止回退

- `pnpm run check:ma-structure`：检查全部 Ma 目录、公共入口、类型出口，以及源码中跨组件的内部路径导入；扫描不依赖 Git 收录状态。
- `pnpm run check:ma`：结构检查、全部 Ma 组件类型检查、Lint、行为测试。
- 目录或职责迁移另外运行 `pnpm run typecheck`、`pnpm run check:boundaries`、`pnpm run check:application-boundaries`、`pnpm run check:modules`，并运行受影响的架构和行为测试。

`tsconfig.ma-components.json` 使用 `ma-*` 模式覆盖新增组件；公共导出清单和 Tailwind 扫描沿用组件目录覆盖。检查规则在 `scripts/check-ma-structure.mjs`，其回归测试在 `tests/component-boundaries.test.mjs`。浏览器验证仍遵守仓库的用户确认要求。
