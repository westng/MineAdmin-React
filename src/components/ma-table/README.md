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
| `tabs` | 搜索区和工具栏之间的标签配置，兼容自定义 JSX | `MaTableTabsConfig \| ReactNode` | - |
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
| `showOverflowTooltip` | 文本发生省略时点击查看完整内容 | `boolean` | `true` |
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

提供分页配置且未提供 `pagination.total` 时，组件对完整数据执行本地分页；提供 `total` 时，默认将 `data` 视为接口返回的当前页。`manualPagination: false` 可显式启用本地分页，`true` 则保留接口数据。`showPagination: false` 或没有分页配置时不切分本地数据；隐藏分页器不会替接口请求其他页。默认每页选项为 `[10, 20, 50, 100]`。

`rowClassName`、`rowStyle` 作用于实际 DataGrid 数据行；`on.sortChange` 保留兼容回调。历史字段 `showOverflowTooltip`、`adaption`、`adaptionOffsetBottom`、`highlightCurrentRow` 不产生额外行为；新代码通过下述类型化入口设置对应布局或自行渲染单元格。

## 配置更新与 ReUI 扩展

新的 `columns/options/data` props 会更新组件。ref 方法可修改当前配置；对应 props 换成新引用后，以新 props 为准，不重新套用旧的 ref 修改。`pagination` 更新同样遵守此规则。推荐通过 `useMemo` 保持未变化的配置引用。

| 入口 | 用途 |
| --- | --- |
| `options.dataGridProps` | DataGrid 布局、国际化、单元格编辑事件、行扩展属性等；布局与 class 配置在 Ma 默认值上合并 |
| `options.tableOptions` | TanStack v9 的列显示、列顺序、固定列、筛选、元数据等配置和状态 |
| `column.columnDef` | 原生 ColumnDef，例如 `meta.cellEdit`、`meta.fillWidth`、`enableResizing` 和自定义 accessor/cell |
| `options.gridTableProps` | 标准表体的 `renderHeader/footerContent` |
| `options.scrollAreaProps` | ScrollArea 属性和样式 |
| `options.paginationProps` | 官方 DataGridPagination 的展示配置 |
| `options.renderTable(table)` | 在 DataGrid 上下文中使用 Dnd、Virtual 等表体变体 |
| `ref.getTableInstance()` | 当前 TanStack 实例，例如 `setColumnOrder`、`setColumnVisibility`、`setColumnSizing` |

```tsx
const options: MaTableOptions<UserRow> = {
  dataGridProps: {
    tableLayout: { columnsResizable: true, columnsMovable: true, columnsPinnable: true, headerSticky: true },
    getRowProps: row => ({ 'aria-label': row.name }),
  },
  tableOptions: { initialState: { columnVisibility: { status: false } } },
}
```

Ma 管理数据源、列结构、行键、分页、排序、行选择及展开状态，这些配置不能从 `tableOptions` 再覆盖。`dataGridProps` 不接收重复的 `table/recordCount/isLoading/children`；使用 Ma 的对应属性。官方拖动和虚拟表体需要通过 `renderTable` 组合对应组件和回调，单独开启 `columnsDraggable/rowsDraggable` 不会自动切换表体。表格仍是业务适配层，不等同于任意 TanStack 功能组合。

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
| `cellRenderTo` | 调用已注册的单元格渲染器，`props` 支持按行求值 | `{ name, props?: object \| unknown[] \| ((context) => object \| unknown[]) }` |
| `headerRender` | 表头渲染函数 | `(column) => ReactNode` |
| `children` | 多级列配置 | `MaTableColumn<T>[]` |
| `expandedRender` | 展开行内容渲染函数 | `(context) => ReactNode` |

普通数据列的优先级为 `cellRender` → 已注册的 `cellRenderTo` → `formatter` → 原始值。未知渲染器回退到 `formatter` 或原始值，空值显示为 `-`；渲染器主动返回 `null` 时保留空白。显式设置 `columnDef.cell` 时使用该原生渲染器。`children` 保留分组表头，隐藏父分组会隐藏其子列；`fixed: true/'left'` 映射为起始侧固定，`'right'` 映射为末尾侧固定，分组固定设置向子列继承。

### 单元格渲染插件

```tsx
const columns = [{
  label: '状态',
  prop: 'status',
  cellRenderTo: {
    name: 'west/cell-enhance',
    props: { type: 'badge', props: { variant: 'success-light' } },
  },
}]
```

插件在 `install` 中调用 `registerTableCellRenderer({ name, render })` 注册。`render(context, props)` 接收行、列、索引、原始值和已求值的配置，返回 React 节点。`props` 可写为 `(context) => 配置对象`。同一注册表由 `MaTable` 和 `MaProTable` 共用；注册、替换、移除后，已挂载表格会更新。

`registerTableCellRenderer` 返回本次注册的注销函数，也可使用 `removeTableCellRenderer(name)` 主动移除。注销旧注册不会移除后来替换的实现。注册接口及相关类型均从两类表格的入口导出。

## 标签切换

`tabs` 传入配置后，由 `MaTable` 渲染下划线标签和数量角标，标签栏位于 `headerContent` 与工具栏上方。未传或 `items` 为空时不占空间；已有 JSX 插槽仍然可用。

```tsx
<MaTable
  columns={columns}
  data={data}
  tabs={{
    value: activeTab,
    items: [
      { value: 'members', label: 'Members', count: 5 },
      { value: 'roles', label: 'Roles', count: 4 },
      { value: 'billing', label: 'Billing', count: 4, disabled: true },
    ],
    onValueChange: value => setActiveTab(value),
  }}
/>
```

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| `items` | 标签列表，`value` 必须唯一 | `readonly MaTableTabItem[]` |
| `value` | 受控选中值，由页面在回调中更新 | `string \| number` |
| `defaultValue` | 非受控初始值；缺省或选项失效时选中首个可用标签 | `string \| number` |
| `ariaLabel` | 标签栏的无障碍名称，默认“表格标签” | `string` |
| `onValueChange` | 切换回调，传回选中值及对应配置 | `(value: MaTableTabValue, item: MaTableTabItem) => void` |

每个标签支持 `value`、`label: ReactNode`、`count?: number | string` 和 `disabled?: boolean`。数量为 `0` 时仍显示角标，未提供数量时不显示。标签值和数量可以随页面状态更新。

组件复用 Base UI Tabs 的焦点和键盘操作：方向键移动焦点，Enter/空格激活标签。标签对应同一个表格面板；数据筛选、请求和分页策略由调用方处理，不根据标签值自行猜测接口字段。

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

`onSelectionChange` 在挂载和当前页已选行变化后通知调用方；只替换回调、行键函数或包含相同行对象的数据数组不会再次通知。选中行替换为新的数据对象时会通知。后续选择使用最新回调，回调返回值被忽略。需要跨页保留业务选择时，使用 `MaProTable.selection.crossPage`。

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
| `getTableInstance()` | 获取 TanStack v9 表格实例 | `DataGridTableInstance<T>` |

## 目录职责

- `index.ts`：唯一公开入口。
- `types/index.ts`：列、分页、工具栏和实例类型。
- `components/ma-table.tsx`：表格状态、DataGrid 适配和主体视图编排。
- `components/ma-table-header.tsx`：基础 Table 兼容实现（由旧调用保留）。
- `components/ma-table-body.tsx`：基础 Table 兼容实现（由旧调用保留）。
- `components/ma-table-pagination.tsx`：基础 Table 兼容分页实现（由旧调用保留）。
- `components/ma-table-toolbar.tsx`：左、中、右工具栏布局。
- `components/ma-table-tabs.tsx`：标签配置、选中态、数量角标和兼容插槽。
- `hooks/`：选择和排序状态逻辑。
- `utils/table-utils.ts`：字段、列和行样式辅助函数。

## 相关链接

- [MineAdmin MaTable 官方文档](https://doc.mineadmin.com/libs/ma-table/latest/)
