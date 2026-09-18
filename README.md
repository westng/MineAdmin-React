# MineAdmin React

基于 MineAdmin 3.2 的 React 后台应用模板。使用 React 19、TypeScript、Vite、React Router、TanStack Query、Zustand、Tailwind CSS、ReUI 和 Ma 组件；当前不发布独立 npm SDK。

## 开始开发

需要 Node.js `>=20.19.0` 与 pnpm `11.7.0`。CI 使用 Node 20.19 和 22。

```bash
pnpm install --frozen-lockfile
# 首次配置时复制示例；不要覆盖已有环境文件。
cp .env.example .env.development.local
pnpm run dev
```

默认端口为 2777，示例配置将 `/dev` 代理到本机 MineAdmin 后端 9601 端口。开发服务器地址以实际配置为准。`VITE_` 变量进入浏览器产物，不得保存服务端凭据。

## 架构与扩展

- `src/app`：应用组合、启动、Provider 装配与可选应用适配入口。
- `src/services`、`src/provider`：纯平台服务与会话、导航、HTTP、Query、插件、语言的应用装配。
- `src/router`：唯一 Route Registry、组件 Manifest、访问策略与可选页面缓存。
- `src/layouts`：classic、columns、mixed 布局及共享 Shell 插槽。
- `src/modules/base`：公共基础功能，按 api、hooks、locales、views 聚合。
- `src/components/ma-*`、`src/components/reui`：公共组件与 UI 原语。
- `src/hooks/framework`、`src/hooks/shell`：框架和布局 Hooks。

[架构文档](ARCHITECTURE.md) 定义公共入口与依赖规则。[扩展指南](docs/EXTENSIONS.md) 包含插件、模块、Dashboard 与布局接入；[迁移指南](docs/MIGRATION.md) 说明兼容路径和旧菜单别名。

应用扩展从 `src/app/application.tsx` 装配；缺少该文件时使用默认空适配器。应用模块、私有插件和私有组件不属于公共模板。发布清单由 `scripts/public-files.mjs` 维护，不能仅依赖 `.gitignore` 判定历史 Git 文件是否公开。

## 检查

| 命令 | 作用 |
| --- | --- |
| `pnpm run check` | 全项目 TypeScript、ESLint、格式检查 |
| `pnpm run check:ma` | Ma/ReUI 类型及 Ma 组件 lint、行为测试 |
| `pnpm run check:framework` | 物理目录、组件闭包、架构依赖和框架行为测试 |
| `pnpm run check:bootstrap` | 合成存储、阻断网络的启动装配检查 |
| `pnpm run build` | 当前应用的生产构建 |
| `pnpm run build:public-smoke` | 仅公共源码的临时目录构建 |
| `pnpm run export:public` | 导出公共源码与 SHA-256 清单到新的 dist-source 目录 |
| `pnpm run check:public-index` | Git 跟踪内容的发布边界检查 |
| `pnpm audit --prod --audit-level=high` | 生产依赖安全审计 |

安装脚本启用本项目 Git hooks，提交与推送运行 `check`。CI 还检查公共架构和构建。DOM 模拟测试、构建、真实浏览器、真实后端和生产验收是不同的验证层级。

## 配置与限制

`.env.example` 是配置说明入口。路由支持 hash/history；使用 history 时，部署服务器必须配置 SPA 回退。默认 iframe 白名单为空；`VITE_IFRAME_ORIGINS` 使用逗号分隔的精确 origin，构建会生成 frame-src CSP。反向代理的 CSP 也必须与它一致。

`VITE_BUILD_SOURCEMAP` 控制生产 sourcemap。项目不自动生成 gzip/Brotli 归档。页面缓存为显式选择，最多 8 页；国际化支持语言注册和缺失回退，不表示所有页面已经完整翻译。尚未实现的旧设置字段在类型和迁移文档中标记为兼容字段。

组件参考：[MaForm](src/components/ma-form/README.md)、[MaSearch](src/components/ma-search/README.md)、[MaTable](src/components/ma-table/README.md)、[MaProTable](src/components/ma-pro-table/README.md)、[MaDialog](src/components/ma-dialog/README.md)、[MaDrawer](src/components/ma-drawer/README.md)。UI 原语由 `components.json` 配置统一生成到 `components/reui/primitives`。

## 许可

使用 [Apache-2.0](LICENSE)。ReUI、shadcn/ui、Base UI 等上游来源见 [第三方声明](THIRD_PARTY_NOTICES.md)；迁移目录不改变上游许可。
