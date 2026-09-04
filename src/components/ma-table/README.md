# MaTable

`MaTable` 负责通用表格渲染、列配置、选择、排序、展开行和分页。数据请求与业务操作不属于表格组件职责。

目录职责：

- `index.ts`：唯一公开入口，只导出组件和公开类型。
- `components/ma-table.tsx`：组件状态编排与表格视图渲染。
- `components/`：表头、表体、分页等展示部件。
- `components/ma-table-toolbar.tsx`：工具条三插槽布局。
- `hooks/`：选择与排序状态逻辑。
- `utils/`：列值、行键、列展开和行样式解析。
- `types/index.ts`：对外公开接口；内部组件参数不从这里泄漏。

工具条通过 `toolbarLeft`、`toolbar`、`toolbarRight` 三个插槽提供左侧、中间和右侧内容；未提供任何内容时不渲染工具条区域。

公开入口：

```ts
import { MaTable, type MaTableColumn, type MaTableOptions, type MaTableExpose } from '@/components/ma-table'
```

核心契约位于 `types/index.ts`：`MaTableProps<T>`、`MaTableColumn<T>`、`MaTableOptions<T>`、`MaTablePagination`、`MaTableExpose<T>`。

未提供 `pagination.total` 时，表格对完整数据执行本地分页；`sortable: 'custom'` 只触发排序回调，不在组件内重新排序。行内按钮、复选框和链接不会冒泡触发行点击回调。
