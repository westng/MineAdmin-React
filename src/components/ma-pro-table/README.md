# MaProTable

`MaProTable` 组合 `MaSearch` 与 `MaTable`，统一搜索、分页、请求、响应解析和刷新实例 API。业务页面只提供 schema、请求函数和工具栏。

公开入口：

```ts
import { MaProTable, type MaProTableSchema, type MaProTableOptions, type MaProTableExpose } from '@/components/ma-pro-table'
```

核心契约位于 `types.ts`：`MaProTableProps<T>`、`MaProTableSchema<T>`、`MaProTableOptions<T>`、`MaProTableColumns<T>`、`MaProTableExpose<T>`。

组件默认使用独立区域布局；需要整卡展示时传入 `variant="card"`，标签页通过 `tabs` 插槽传入 ReUI `Tabs` 组合，组件不承载业务标签和计数逻辑。
