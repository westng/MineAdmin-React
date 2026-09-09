# MaTable

`MaTable` 是 React 端的通用表格组件，负责列配置、数据展示、选择、排序、展开行、加载态和分页。请求、权限、批量业务操作和数据转换由页面或 `MaProTable` 负责。

本文按当前 `web/src/components/ma-table` 源码整理。表格使用项目内官方 ReUI `DataGrid` 和 TanStack Table v9，不依赖 Vue、Element Plus 或独立的 `@mineadmin/table` 运行时包。

## 快速开始

```tsx
import { MaTable, type MaTableColumn, type MaTableOptions } from '@/components/ma-table'

interface UserRow {
  id: number
  name: string
  status: string
}

const data: UserRow[] = [
  { id: 1, name: '张三', status: '启用' },
  { id: 2, name: '李四', status: '禁用' },
]

const columns: MaTableColumn<UserRow>[] = [
  { type: 'selection', width: 44, label: '' },
  { prop: 'name', label: '姓名' },
  { prop: 'status', label: '状态', sortable: true },
]

const options: MaTableOptions<UserRow> = {
  rowKey: row => row.id,
  stripe: true,
  showPagination: false,
}

export function UserTable() {
  return (
    <MaTable
      columns={columns}
      data={data}
      options={options}
      onSelectionChange={rows => { console.log(rows) }}
    />
  )
}
```

## Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `columns` | 列配置数组 | `MaTableColumn<T>[]` | `[]` |
| `data` | 表格数据；优先于 `options.data` | `T[]` | `[]` |
| `options` | 表格行为、分页和样式配置 | `MaTableOptions<T>` | `{}` |
| `className` | 表格根容器 class | `string` | - |
| `toolbarLeft` | 工具栏左侧插槽 | `ReactNode` | - |
| `toolbarCenter` | 工具栏中间插槽 | `ReactNode` | - |
| `toolbarRight` | 工具栏右侧插槽 | `ReactNode` | - |
| `toolbar` | `toolbarCenter` 的兼容别名 | `ReactNode` | - |
| `headerContent` | 工具栏上方的内容插槽 | `ReactNode` | - |
| `footerContent` | 工具栏与表格之间的内容插槽 | `ReactNode` | - |
| `loading` | 覆盖当前加载状态 | `boolean` | - |
| `onSelectionChange` | 选择行变化回调 | `(rows: T[]) => void` | - |
| `onRowClick` | 行点击回调 | `(row: T, index: number) => void` | - |
| `onSortChange` | 排序状态变化回调 | `(prop, order) => void` | - |
| `empty` | 空数据内容 | `ReactNode` | - |

当 `options` 和组件属性同时提供同一数据源时，组件属性优先。`toolbar` 仅为旧调用方式保留，新代码优先使用三个具名插槽。

## MaTableOptions

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `data` | 表格数据 | `T[]` | `[]` |
| `containerHeight` | 根容器高度 | `string` | - |
| `loading` | 显示加载遮罩 | `boolean` | `false` |
| `columnAlign` | 单元格默认对齐 | `'left' | 'center' | 'right'` | `'left'` |
| `headerAlign` | 表头默认对齐 | `'left' | 'center' | 'right'` | - |
| `pagination` | 分页配置和回调 | `MaTablePagination` | - |
| `showPagination` | 是否显示分页器 | `boolean` | `true`（存在分页配置时） |
| `height` | 表格高度 | `string | number` | - |
| `maxHeight` | 表格最大高度 | `string | number` | - |
| `stripe` | 是否显示斑马纹 | `boolean` | `false` |
| `border` | 是否给表格单元格添加分隔边框 | `boolean` | `false` |
| `dense` | 是否使用目标站的紧凑密度 | `boolean` | `false` |
| `showHeader` | 是否显示表头 | `boolean` | `true` |
| `rowKey` | 行键字段或计算函数 | `string | ((row: T) => string | number)` | `row.id`、`row.key` 或索引 |
| `rowClassName` | 行 class 或计算函数 | `string | ((row, index) => string)` | - |
| `rowStyle` | 行样式或计算函数 | `CSSProperties | ((row, index) => CSSProperties)` | - |
| `emptyText` | 默认空数据文案 | `string` | `'暂无数据'` |
| `tableLayout` | 表格布局算法 | `'fixed' | 'auto'` | `'fixed'` |
| `className` | 表格内容 class | `string` | - |

未提供 `pagination.total` 时，组件会对当前完整数据执行本地分页；提供 `total` 时，当前 `data` 被视为接口返回的当前页数据。分页默认每页选项为 `[10, 20, 50, 100]`，由官方 DataGrid 分页器渲染，并在 `MaProTable` 的 `FrameFooter` 中继承面板左右内边距。

类型中还保留了 `showOverflowTooltip`、`adaption`、`adaptionOffsetBottom`、`highlightCurrentRow`、`rowClassName`、`rowStyle` 和 `on` 字段，但当前 DataGrid 渲染器不会读取这些字段；不要依赖它们产生额外行为。

## MaTableColumn

| 参数 | 说明 | 类型 |
| --- | --- | --- |
| `label` | 表头文本、节点或计算函数 | `string | ReactNode | ((column) => ReactNode)` |
| `prop` | 字段路径、字段键或取值函数 | `string | keyof T | ((row: T) => unknown)` |
| `type` | 特殊列类型 | `'selection' | 'index' | 'expand'` |
| `width` / `minWidth` | 列宽和最小列宽 | `string | number` |
| `fixed` | 固定列声明 | `boolean | 'left' | 'right'` |
| `hide` | 是否隐藏列或动态判断 | `boolean | ((column) => boolean)` |
| `sortable` | 是否允许排序；`custom` 只回调不本地排序 | `boolean | 'custom'` |
| `align` / `headerAlign` | 单元格和表头对齐 | `'left' | 'center' | 'right'` |
| `className` / `headerClassName` | 单元格和表头 class | `string` |
| `formatter` | 默认值格式化函数 | `(row, column, value, index) => ReactNode` |
| `cellRender` | 单元格渲染函数 | `(context) => ReactNode` |
| `headerRender` | 表头渲染函数 | `(column) => ReactNode` |
| `children` | 多级列配置 | `MaTableColumn<T>[]` |
| `expandedRender` | 展开行内容渲染函数 | `(context) => ReactNode` |

`cellRender` 优先于 `formatter`；没有自定义渲染器时，空值显示为 `-`。`fixed` 当前只存在于类型契约中，组件不会额外改变列布局。

## 工具栏插槽

`headerContent` 会位于工具栏之前；工具栏由 `MaTable` 唯一渲染，三个插槽分别对应固定的布局区域，并沿用目标站的 `border-b px-3 py-3` 工具条节奏。`footerContent` 位于工具栏与表格之间：

```tsx
<MaTable
  columns={columns}
  data={data}
  toolbarLeft={<div className="flex gap-2"><Button>新增</Button><Button variant="destructive">批量删除</Button></div>}
  toolbarCenter={<span className="text-sm text-muted-foreground">用户列表</span>}
  toolbarRight={<Button variant="outline">刷新</Button>}
/>
```

| 插槽 | 对齐方式 | 用途 |
| --- | --- | --- |
| `toolbarLeft` | 左对齐 | 创建、批量操作和筛选上下文 |
| `toolbarCenter` | 居中 | 标题、统计或中间操作 |
| `toolbarRight` | 右对齐 | 刷新、设置和导出 |

未提供任何插槽时不会渲染工具栏区域。工具栏根节点带有 `role="toolbar"` 和默认 `aria-label="表格工具栏"`；需要直接复用布局时，可从公共入口导入 `MaTableToolbar`。

## 排序、选择和展开

- `sortable: true`：点击表头在升序、降序和无排序之间切换，并对当前数据本地排序。
- `sortable: 'custom'`：只触发 `onSortChange`，不在组件内改变行顺序，适合远程排序。
- `type: 'selection'`：启用行选择；表头复选框支持全选和半选状态。
- `type: 'index'`：显示当前页序号。
- `type: 'expand'`：显示展开按钮，并使用该列的 `expandedRender` 渲染展开行。
- 行内按钮、输入框、链接和复选框不会冒泡触发行点击回调。

## 实例方法

```tsx
const tableRef = useRef<MaTableExpose<UserRow>>(null)

tableRef.current?.setColumns(nextColumns)
tableRef.current?.setPagination({ currentPage: 1 })
tableRef.current?.clearSelection()
```

| 方法 | 说明 | 返回值 |
| --- | --- | --- |
| `setData(data)` | 替换内部数据 | `void` |
| `setPagination(pagination)` | 合并分页配置 | `void` |
| `setCurrentPage(page)` | 设置当前页 | `void` |
| `getCurrentPage()` | 获取当前页 | `number` |
| `setLoadingState(loading)` | 设置运行时加载状态 | `void` |
| `setOptions(options)` | 合并更新表格配置 | `void` |
| `getOptions()` | 获取当前配置 | `MaTableOptions<T>` |
| `setColumns(columns)` | 替换列配置 | `void` |
| `getColumns()` | 获取列配置 | `MaTableColumn<T>[]` |
| `appendColumn(column)` | 追加列 | `void` |
| `removeColumn(prop)` | 按 `prop` 删除列 | `void` |
| `getColumnByProp(prop)` | 按 `prop` 查找列 | `MaTableColumn<T> | null` |
| `getSelectionRows()` | 获取当前页已选行 | `T[]` |
| `clearSelection()` | 清除当前选择 | `void` |
| `getElTableRef()` | 获取原生 `HTMLTableElement` | `HTMLTableElement | null` |

## 目录职责

- `index.ts`：唯一公开入口。
- `types/index.ts`：列、分页、工具栏和实例类型。
- `components/ma-table.tsx`：表格状态、DataGrid 适配和主体视图编排。
- `components/ma-table-header.tsx`：基础 Table 兼容实现（由旧调用保留）。
- `components/ma-table-body.tsx`：基础 Table 兼容实现（由旧调用保留）。
- `components/ma-table-pagination.tsx`：基础 Table 兼容分页实现（由旧调用保留）。
- `components/ma-table-toolbar.tsx`：左、中、右工具栏布局。
- `hooks/`：选择和排序状态逻辑。
- `utils/table-utils.ts`：字段、列和行样式辅助函数。

## 相关链接

- [MineAdmin MaTable 官方文档](https://doc.mineadmin.com/libs/ma-table/latest/)
