# 变更记录

本文件记录 MineAdmin-React 框架的变化，Release 变更说明以对应版本条目为准。日常变更汇总到 `Unreleased`，发版时按版本号和实际发布日期归档；维护流程见 [贡献规范](CONTRIBUTING.md#变更记录与发版)。

## Unreleased

以下为尚未按版本发布的框架变化；不表示已经部署或完成应用验收。

### 新增

- 新增 Actions Release 流程：版本 Tag 或手动运行触发，复用完整 CI 后发布公开源码包、静态构建包与 SHA-256 校验文件；校验 Tag、版本和完整 CHANGELOG，支持预发布并拒绝覆盖已有 Release。
- MaDialog 支持鼠标和触摸拖动标题栏，默认启用，可通过 `draggable={false}` 关闭；拖动受视口边界约束，全屏、关闭后重开或窗口尺寸变化时清除偏移。
- MaProTable 的 `getRequestParams(form?)` 支持传入表单快照，合并固定参数并执行 `paramsTransform` 后剔除分页；省略参数时仍读取已提交筛选，读取快照不会触发搜索或改变列表状态。
- ReUI 新增文件类型展示与进度条原语，支持文件名和 MIME 类型解析，以及 `value={null}` 的不确定进度展示；同步第三方来源清单和组件说明。

### 兼容性变化

- MaForm 的 `InputNumber`、`Switch`、`Radio`、`Checkbox` 不再显示清除按钮，传入 `clearable: true` 也不会启用。
- 共用 Select 面板默认 `alignItemWithTrigger: false`，可显式设为 `true`；列表统一提供内边距，分组不重复添加。
- 公共源码导出和构建 smoke 默认读取 HEAD 的 Git blob；预览未提交修改需显式传 `--working-tree`。
- 认证客户端拒绝向 API origin 以外的来源发送 Authorization；跨来源请求需独立客户端。
- MaForm 移除从未实现的 `cols.xs/sm/md/lg/xl` 类型；继续支持 `span/offset`。
- 插件通过 `install(runtime)` 注册能力并返回清理函数；启动不调用 `hooks.setup`。安装本身没有默认超时；HTTP `networkRequest` 钩子默认等待上限为 10 秒。

### 架构与修复

- 升级 Axios / http-proxy 的 `follow-redirects` 传递依赖至 `1.16.2`，修复自定义敏感请求头可能随重定向泄露的高危漏洞（[GHSA-mrwp-f3q8-3g9p](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p)）。
- 构建版本信息从 `package.json` 读取，随发布版本更新；公共构建可从 Git 快照保留经过检查的静态产物，临时目录复用已安装依赖，避免 PNPM 11 自动重装共享依赖。
- MaTable 和 MaProTable 分页器增加指定页跳转，支持回车、页码边界校验，以及 `showQuickJumper` 显隐配置。
- Ma 组件按实现、类型、Hook、上下文和纯工具整理目录，通过公共入口共享能力；新增结构校验并同步类型检查与导出清单。
- 新增 MaUpload、MaDownload、MaEmpty；MaForm 支持声明式 DictSelect 和 Upload，上传下载能力由调用方注入。
- 修复 MaForm Select 清除按钮与下拉箭头的位置冲突，补充控件交互回归测试。
- Vite 在源码新增、删除时合并触发模块图重建，普通编辑继续使用 Fast Refresh。
- 新增 `createAppRuntime` 组合工厂，拆分认证、导航、业务 API 的实例实现与应用装配入口，消除核心值依赖循环。
- Base 请求、缓存、权限回调使用注入 runtime；字典和 Shell 插槽支持实例隔离。
- 同源会话身份变化清理旧资料、权限和缓存，阻止旧刷新或响应回填。
- 用户列表观察 Query 缓存，写入失效后自动更新。
- 修复 MaForm 数组路径、过期异步校验、重复提交与提交失败状态；补齐布局参数并同步文档。
- 注册订阅者异常不再破坏资源所有权；依赖门禁覆盖别名、相对路径和循环。
- 公共清单排除系统元数据；新增第三方源码哈希清单和贡献、安全反馈约定。

### 当前入口与文档

- 明确每次提交同步更新 CHANGELOG、推送前核对日志已入库，Release 正文携带对应版本的完整变更内容。
- 整理公开文档及配置注释，使其仅描述 MineAdmin-React 框架的架构、接入与发布契约，示例统一使用通用模块和接口。
- Base 页面按子模块组织，页面入口为 `base/<子模块>/views/index`；旧目录不提供转发别名。
- API 消费使用 `useRuntimeFactory(createApi)`；设置、标签、语言、字典与 Toast 绑定当前 Runtime / Provider。
- 路由、插件和 Shell 插槽统一见 [路由文档](docs/ROUTING.md)，导入路径变化见 [迁移指南](docs/MIGRATION.md)。
