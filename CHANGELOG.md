# 变更记录

## Unreleased — 2026-09-28

以下为当前工作树的未发布变化；不表示已经发布、部署或完成业务验收。

### 兼容性变化

- 公共源码导出和构建 smoke 默认读取 HEAD 的 Git blob；预览未提交修改需显式传 `--working-tree`。
- 认证客户端拒绝向 API origin 以外的来源发送 Authorization；跨来源请求需独立客户端。
- MaForm 移除从未实现的 `cols.xs/sm/md/lg/xl` 类型；继续支持 `span/offset`。
- 插件通过 `install(runtime)` 注册能力并返回清理函数；启动不调用 `hooks.setup`。安装本身没有默认超时；HTTP `networkRequest` 钩子默认等待上限为 10 秒。

### 架构与修复

- 新增 `createAppRuntime` 组合工厂，拆分认证、导航、业务 API 的实例实现与应用装配入口，消除核心值依赖循环。
- Base 请求、缓存、权限回调使用注入 runtime；字典和 Shell 插槽支持实例隔离。
- 同源会话身份变化清理旧资料、权限和缓存，阻止旧刷新或响应回填。
- 用户列表观察 Query 缓存，写入失效后自动更新。
- 修复 MaForm 数组路径、过期异步校验、重复提交与提交失败状态；补齐布局参数并同步文档。
- 注册订阅者异常不再破坏资源所有权；依赖门禁覆盖别名、相对路径和循环。
- 公共清单排除系统元数据；新增第三方源码哈希清单和贡献、安全反馈约定。

### 当前入口与文档

- Base 页面按子模块组织，页面入口为 `base/<子模块>/views/index`；旧目录不提供转发别名。
- API 消费使用 `useRuntimeFactory(createApi)`；设置、标签、语言、字典与 Toast 绑定当前 Runtime / Provider。
- 路由、插件和 Shell 插槽统一见 [路由文档](docs/ROUTING.md)，导入路径变化见 [迁移指南](docs/MIGRATION.md)。
