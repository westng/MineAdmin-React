# ReUI 公共边界

UI 原语从 `@/components/reui/primitives/<组件>` 按需导入；`components.json` 的生成目录与此一致。Ma 和 ReUI 不得通过相对路径、类型导入、再导出或动态导入访问其他组件目录、应用 Store、业务模块或插件。

通用反馈使用 `toast` / `useToast`，应用根挂载一次 `ToastProvider`。配色选择器接收 `colors`、value 和 onChange，不能自行读取设置 Store。图标从 `@/components/ma-icon` 导入。`utils` 是 Ma/ReUI 内部共享能力，不是业务服务目录。

新旧 Sidebar、Chart 和 Toast 的本地兼容入口共用实现，避免出现两个 Context。其他旧私有目录不属于公开 API，不允许进入公共依赖闭包。

`check:boundaries` 会遍历源码的直接与传递导入；资源许可和仓库历史收录仍需独立发布检查。
