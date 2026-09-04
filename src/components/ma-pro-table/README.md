# MaProTable

`MaProTable` 组合 `MaSearch` 与 `MaTable`，统一搜索、分页、请求、响应解析和刷新实例 API。业务页面只提供 schema、请求函数和工具栏。

公开入口：

```ts
import { MaProTable, type MaProTableSchema, type MaProTableOptions, type MaProTableExpose } from '@/components/ma-pro-table'
```

核心契约位于 `types/index.ts`：`MaProTableProps<T>`、`MaProTableSchema<T>`、`MaProTableOptions<T>`、`MaProTableColumns<T>`、`MaProTableExpose<T>`。

目录职责：

- `index.ts`：唯一公开入口，只导出组件和公开类型。
- `types/index.ts`：公开接口与组件契约，不放渲染逻辑。
- `components/ma-pro-table.tsx`：组件状态编排与视图渲染。
- `utils/pro-table-utils.ts`：响应解析和通用显示状态辅助函数。

组件默认使用独立区域布局；需要整卡展示时传入 `variant="card"`，标签页通过 `tabs` 插槽传入 ReUI `Tabs` 组合，组件不承载业务标签和计数逻辑。

请求采用序列保护，较早的响应不会覆盖较新的搜索、翻页或 API 切换结果。启用 `selection.crossPage` 时，优先使用 `selection.rowKey`（否则复用表格 `rowKey`）保持跨页选择稳定。
