# MaTable

`MaTable` 负责通用表格渲染、列配置、选择、排序、展开行和分页。数据请求与业务操作不属于表格组件职责。

目录职责：

- `ma-table.tsx`：公开组件入口和状态编排。
- `components/`：表头、表体、分页等展示部件。
- `hooks/`：选择与排序状态逻辑。
- `utils/`：列值、行键、列展开和行样式解析。
- `types.ts`：对外公开接口；内部组件参数不从这里泄漏。

公开入口：

```ts
import { MaTable, type MaTableColumn, type MaTableOptions, type MaTableExpose } from '@/components/ma-table'
```

核心契约位于 `types.ts`：`MaTableProps<T>`、`MaTableColumn<T>`、`MaTableOptions<T>`、`MaTablePagination`、`MaTableExpose<T>`。
