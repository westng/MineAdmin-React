# 参与开发

本仓库发布连接 MineAdmin 后端的前端源码模板。框架分发范围以 `scripts/public-files.mjs` 为准；BioTech 的应用装配、业务模块和插件由主仓库开源，不进入框架导出包。环境文件不进入发行内容。

先阅读 [架构契约](ARCHITECTURE.md)，使用 `.node-version` 与 `package.json` 声明的工具链，通过 `pnpm install --frozen-lockfile` 安装依赖。复制 `.env.example` 时使用本地测试后端，不提交凭据或真实数据。

## 开发与验证

- 新业务子模块使用 `api / locales / views` 结构；有复用状态或生命周期时再创建 `hooks/`。API 工厂接受 runtime，React 消费者通过 `useRuntimeFactory(createApi)` 获取当前实例。普通 CRUD 将资源 list API 直接传给 MaProTable，保留其 `queryOptions`；页面不导入默认应用的 HTTP、Query 或会话单例。
- 通用能力放在 `services`，用明确端口访问外部能力；导航契约位于 `services/navigation`。服务不依赖 React、Provider 或业务模块。
- 修复行为缺陷时补充覆盖触发条件的回归测试。公共契约变化同时更新类型、说明和 `CHANGELOG.md`，不要只改变实现。
- 按改动范围验证：TypeScript 改动运行 `pnpm run typecheck`，局部修改只检查相关文件的 ESLint / Prettier；Ma 实现或契约改动运行 `pnpm run check:ma`。目录迁移另查 `check:boundaries`、`check:application-boundaries`、`check:modules` 和相关测试；装配改动运行 `check:bootstrap`（阻断网络）。`pnpm run check` 是提交钩子使用的全量检查。
- 发布范围运行 `pnpm run check:public-index`，第三方来源清单运行 `pnpm run check:vendor`。完整生产构建是独立验收步骤；不要把类型、测试或开发启动通过称为生产构建通过。

## Pull request

说明具体触发条件、修改后的行为、兼容性影响及实际运行的验证。按路径提交本次改动，保留其他工作；不要为了让框架源码检查通过而扩大分发范围或收录环境文件、构建产物。

`export:public` 和 `build:public-smoke` 默认读取 HEAD；本地验证未提交源码需显式加 `--working-tree`。工作树导出不能代替提交后的发布验证。

ReUI 源码修改需同步第三方来源清单：审查变更后运行 `node scripts/check-vendor-inventory.mjs --write`，在 PR 说明来源、原因、上游版本（能核实时）和验证。更新哈希只表示确认本地变更，不证明与上游版本一致。
