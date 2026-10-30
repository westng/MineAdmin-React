# ReUI 公共边界

UI 原语从 `@/components/reui/primitives/<组件>` 按需导入；`components.json` 的生成目录与此一致。Ma 和 ReUI 不得通过相对路径、类型导入、再导出或动态导入访问其他组件目录、应用 Store、业务模块或插件。

通用反馈在 `ToastProvider` 内通过 `useToast` 获取作用域 API，应用 `AppProviders` 已负责挂载；方法与迁移限制见 [Toast](toast.md)。配色选择器接收 `colors`、value 和 onChange，不能自行读取设置 Store。图标从 `@/components/ma-icon` 导入。`utils` 是 Ma/ReUI 内部共享能力，不是业务服务目录。

Sidebar、Chart 等组件以当前文件导出为准；已删除的历史目录没有通用转发保证，不应继续按旧路径导入。

`primitives/progress.tsx` 来源于 [ReUI 的 Base UI Progress](https://github.com/keenthemes/reui/blob/067aa0dc7f8bbfec1cd76fc5ad31f842be5f569a/registry/bases/base/ui/progress.tsx)，按同一版本的 [Nova 样式](https://github.com/keenthemes/reui/blob/067aa0dc7f8bbfec1cd76fc5ad31f842be5f569a/registry/styles/style-nova.css) 展开 Tailwind 类，并适配项目的 `cn` 工具与函数式 `className`。`value={null}` 表示总大小未知，使用不确定进度样式；确定进度由 Base UI 提供数值、可访问属性和填充宽度。

`primitives/file-type.tsx` 来源于 [ReUI 的 File Type](https://github.com/keenthemes/reui/blob/067aa0dc7f8bbfec1cd76fc5ad31f842be5f569a/registry-reui/bases/base/reui/file-type.tsx)，保留格式配色、变体、尺寸以及 `getFileType` 的文件名和 MIME 类型解析，并适配项目的 `cn` 导入。状态点 Badge 按同版本的 [Badge with a status dot](https://github.com/keenthemes/reui/blob/067aa0dc7f8bbfec1cd76fc5ad31f842be5f569a/registry-reui/bases/base/components/badge/c-badge-22.tsx) 组合现有 Badge 与圆点。

`check:boundaries` 会遍历源码的直接与传递导入；资源许可和仓库历史收录仍需独立发布检查。
