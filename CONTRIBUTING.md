# 参与开发

本仓库发布连接 MineAdmin 后端的前端源码模板，框架分发范围以 `scripts/public-files.mjs` 为准。公开仓库、CI 制品、源码导出包和 Release 均遵循这一范围，不收录真实环境配置、凭据或业务数据。

先阅读 [架构契约](ARCHITECTURE.md)，使用 `.node-version` 与 `package.json` 声明的工具链，通过 `pnpm install --frozen-lockfile` 安装依赖。复制 `.env.example` 时使用本地测试后端，不提交凭据或真实数据。

## 开发与验证

- README、架构、迁移指南、组件文档、CHANGELOG、Release 说明及公开配置注释仅描述框架自身的功能与公共契约，不包含接入项目名称、内部仓库关系、本机绝对路径或项目专属业务说明。
- 新业务子模块使用 `api / locales / views` 结构；有复用状态或生命周期时再创建 `hooks/`。API 工厂接受 runtime，React 消费者通过 `useRuntimeFactory(createApi)` 获取当前实例。普通 CRUD 将资源 list API 直接传给 MaProTable，保留其 `queryOptions`；页面不导入默认应用的 HTTP、Query 或会话单例。
- 通用能力放在 `services`，用明确端口访问外部能力；导航契约位于 `services/navigation`。服务不依赖 React、Provider 或业务模块。
- 修复行为缺陷时补充覆盖触发条件的回归测试。公共契约变化同时更新类型、说明和 `CHANGELOG.md`，不要只改变实现。
- 按改动范围验证：TypeScript 改动运行 `pnpm run typecheck`，局部修改只检查相关文件的 ESLint / Prettier；Ma 实现或契约改动运行 `pnpm run check:ma`。目录迁移另查 `check:boundaries`、`check:application-boundaries`、`check:modules` 和相关测试；装配改动运行 `check:bootstrap`（阻断网络）。`pnpm run check` 是提交钩子使用的全量检查。
- 发布范围运行 `pnpm run check:public-index`，第三方来源清单运行 `pnpm run check:vendor`。完整生产构建是独立验收步骤；不要把类型、测试或开发启动通过称为生产构建通过。

## 变更记录与发版

[CHANGELOG.md](CHANGELOG.md) 统一维护框架变更，也是 Release 变更说明的来源；不另行维护一份内容不同的发布日志。

### 提交与推送

- 每次提交都必须更新 `CHANGELOG.md`，包括功能、修复、重构、依赖、测试、文档和 CI 调整。将实际变化写入顶部 `Unreleased` 的相应分类，与相关改动一起提交，不留待发版时补记。
- 条目说明具体变化和影响；有兼容性变化时写清升级注意事项，不把未经验证的行为或检查结果写成已完成。
- 推送前核对待推送提交及对应日志，确认 `CHANGELOG.md` 已随提交保存，而不是仅修改在工作树中。重复推送相同提交时不重复添加条目。

### Actions 发布 Release

1. 确定本次发布版本，将对应的 `Unreleased` 内容归档到 `## [x.y.z] - YYYY-MM-DD`，日期填写实际发布日期；顶部保留新的 `Unreleased`，已发布条目按版本由新到旧排列。
2. 同步 `package.json` 的版本号，使其与 Tag 去掉 `v` 前缀后的版本一致。将版本和日志调整提交、推送，再手动创建并推送对应 `vX.Y.Z` Tag；预发布使用 `vX.Y.Z-rc.1` 等语义版本 Tag。
3. Release 正文必须完整携带 Tag 所指提交中该版本的 CHANGELOG 内容，包括兼容性变化和升级注意事项。不能只贴 CHANGELOG 链接或用自动生成的提交列表替代，也不混入其他版本或尚未发布的条目。
4. [Release 工作流](.github/workflows/release.yml) 校验 Tag、目标提交、版本与日志，复用现有完整 CI，通过后生成公开源码包、静态构建包及 `SHA256SUMS`，自动创建 GitHub Release；预发布 Tag 自动标记为 prerelease。普通分支提交和推送不触发发布，也不自动创建 Tag。
5. 在 Actions 中手动运行 `Release` 时，填写已有版本 Tag；工作流仍校验同一提交并运行完整 CI。已有 Release 会拒绝覆盖，失败后可修复原因再运行；不要移动已发布 Tag。

本地准备后可运行 `pnpm run check:release -- vX.Y.Z` 检查当前 HEAD 是否对应 Tag、`package.json` 与已归档日志。发布正文从该提交的 Git blob 读取完整版本条目，源码包包含 `SOURCE_MANIFEST.json`；静态包按根路径、hash 路由及同源 `/api` 前缀构建，部署时需要对应的后端反向代理。其他 API、路由或子目录配置应使用源码包重新构建。源码交付保留 `CHANGELOG.md` 及历史版本记录，后续改动继续写入新的 `Unreleased`。

## Pull request

说明具体触发条件、修改后的行为、兼容性影响及实际运行的验证。按路径提交本次改动，保留其他工作；不要为了让框架源码检查通过而扩大分发范围或收录环境文件、构建产物。

`export:public` 和 `build:public-smoke` 默认读取 HEAD；本地验证未提交源码需显式加 `--working-tree`。工作树导出不能代替提交后的发布验证。

ReUI 源码修改需同步第三方来源清单：审查变更后运行 `node scripts/check-vendor-inventory.mjs --write`，在 PR 说明来源、原因、上游版本（能核实时）和验证。更新哈希只表示确认本地变更，不证明与上游版本一致。
