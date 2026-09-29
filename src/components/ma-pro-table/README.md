# MaProTable

在应用 Provider 中，请求模式表格通过 `provider/query/table-adapter.ts` 接入 Query。模块资源 API 若携带 `queryOptions(params)`，表格直接复用其资源键和 loader；资源写入后的失效会刷新正在展示的表格。直接传入稳定的资源 API 函数，避免匿名包装丢失 `queryOptions`。普通函数 API 仍使用按表格实例隔离的 Query key；独立使用组件时保留本地请求机制。

`MaProTable` 是 React 端的列表页组合组件。当前版本通过 Frame 组合 `MaSearch`、`MaTable`、请求状态、响应解析、分页和选择状态；页面只需要提供 `schema`、`options` 和业务插槽。

本文按当前 `web/src/components/ma-pro-table` 源码整理。它使用项目内的 `MaTable` 和 ReUI/Base UI，最外层统一由官方 `Frame` 包裹；组件只编排表格布局，不覆盖 `MaTable` 自身的样式配置。

## 快速开始

```tsx
import { useRef } from 'react'
import { useRuntimeFactory } from '@/hooks/runtime'
import { createApi } from '@/modules/base/user/api/user'
import { Button } from '@/components/reui/primitives/button'
import { MaProTable, type MaProTableExpose, type MaProTableSchema } from '@/components/ma-pro-table'

interface UserRow {
  id: number
  username: string
  status: number
}

const schema: MaProTableSchema<UserRow> = {
  tableColumns: [
    { prop: 'username', label: '用户名' },
    { prop: 'status', label: '状态' },
  ],
}

export function UserList() {
  const { pageUsers } = useRuntimeFactory(createApi)
  const tableRef = useRef<MaProTableExpose<UserRow>>(null)

  return (
    <MaProTable<UserRow>
      ref={tableRef}
      schema={schema}
      options={{
        toolbar: true,
        requestOptions: {
          api: pageUsers,
          requestPage: { pageName: 'page', sizeName: 'page_size', size: 20 },
          response: { dataKey: 'list', totalKey: 'total' },
        },
        tableOptions: { rowKey: row => row.id },
      }}
      toolbarLeft={<Button>新增用户</Button>}
      toolbarRight={
        <Button variant="outline" onClick={() => void tableRef.current?.refresh()}>
          刷新
        </Button>
      }
    />
  )
}
```

配置 `requestOptions.api` 后，默认在挂载后及请求参数、分页映射、响应映射或 `requestKey` 变化时请求；`autoRequest: false` 关闭自动请求。父级传入等价配置不会作废正在进行的请求。API 闭包捕获的数据源发生变化时，必须同步改变 `requestKey`，或调用 `changeApi()`；不会通过函数源码判断变化。翻页和调用 `refresh()` 都会按当前参数重新请求。

## 组件关系

```text
MaProTable
└── Frame
    └── FramePanel
        └── MaTable   schema.tableColumns / options.tableOptions
            ├── headerContent: MaSearch + Separator
            ├── tabs: 标签配置或自定义内容
            └── toolbar / table / pagination
```

搜索区由 `MaProTable` 组合为 `MaSearch + Separator`，通过 `MaTable.headerContent` 插槽放在标签和工具栏上方；搜索区默认复用面板内边距，不额外创建卡片边框。标签位于搜索区和工具栏之间。工具栏区域由内部 `MaTable` 唯一渲染。`toolbarLeft`、`toolbarCenter`、`toolbarRight` 分别透传到表格左、中、右插槽；`toolbar` 是中间插槽的兼容别名。`beforeToolbar` 并入左侧，`afterToolbar` 并入右侧。

## Props

| 参数                | 说明                                                                              | 类型                             | 默认值      |
| ------------------- | --------------------------------------------------------------------------------- | -------------------------------- | ----------- |
| `schema`            | 搜索项和表格列配置                                                                | `MaProTableSchema<T>`            | `{}`        |
| `options`           | 请求、搜索、表格和选择配置                                                        | `MaProTableOptions<T>`           | `{}`        |
| `data`              | 页面控制的展示数据，优先于内部请求数据                                            | `T[]`                            | -           |
| `loading`           | 页面控制的加载状态，优先于内部请求状态                                            | `boolean`                        | -           |
| `total`             | 请求模式的总数覆盖；传入 `data` 时参见受控数据展示                                | `number`                         | -           |
| `error`             | 外部错误文本，优先于内部错误                                                      | `string`                         | -           |
| `variant`           | 兼容保留的外观标识；当前布局统一使用 `Frame` + `FramePanel`，不会覆盖表格自身样式 | `'default' \| 'card'`            | `'default'` |
| `className`         | 组件根节点 class                                                                  | `string`                         | -           |
| `header`            | 自定义头部内容                                                                    | `ReactNode`                      | -           |
| `tabs`              | 透传给 `MaTable` 的标签配置或自定义内容                                           | `MaTableTabsConfig \| ReactNode` | -           |
| `toolbarLeft`       | 工具栏左侧内容                                                                    | `ReactNode`                      | -           |
| `toolbarCenter`     | 工具栏中间内容                                                                    | `ReactNode`                      | -           |
| `toolbarRight`      | 工具栏右侧内容                                                                    | `ReactNode`                      | -           |
| `toolbar`           | `toolbarCenter` 的兼容别名                                                        | `ReactNode`                      | -           |
| `beforeToolbar`     | 追加到工具栏左侧前面                                                              | `ReactNode`                      | -           |
| `afterToolbar`      | 追加到工具栏右侧后面                                                              | `ReactNode`                      | -           |
| `empty`             | 表格空数据内容                                                                    | `ReactNode`                      | -           |
| `onSelectionChange` | 选择行变化回调                                                                    | `(rows: T[]) => void`            | -           |

当没有显式中间和右侧内容时，组件会把默认刷新按钮放在右侧；显式提供 `toolbarRight` 后不会额外注入刷新按钮。

无数据时默认显示 `MaEmpty` 插画及“暂无数据”标题；`options.tableOptions.emptyText` 可修改标题。自定义内容按 `empty`、`options.tableOptions.dataGridProps.emptyMessage` 的优先级覆盖默认空状态。加载态仍沿用表格配置。

## MaProTableSchema

| 字段           | 说明                                          | 类型                     |
| -------------- | --------------------------------------------- | ------------------------ |
| `searchItems`  | 搜索区字段配置；存在可见字段时渲染 `MaSearch` | `MaSearchItem<T>[]`      |
| `tableColumns` | 透传给 `MaTable` 的列配置                     | `MaProTableColumns<T>[]` |

`MaProTableColumns<T>` 继承 `MaTableColumn<T>`，包括 `cellRenderTo`。单元格插件由底层 `MaTable` 使用共享注册表执行，配置与注册方式见 [MaTable 单元格渲染插件](../ma-table/README.md#单元格渲染插件)。操作列使用 `type: 'operation'` 和 `operationConfigure` 配置；`type: 'auto'` 默认展示前 2 个操作，其余操作收进“更多”，列宽会按操作文字和图标自动设置最小宽度。

### 业务页面的列配置

- 完整列配置放在所属页面的 `views/data/getTableColumns.tsx`。同一业务组件服务多个页面时，放在该组件所属的 `data/getTableColumns.tsx`，不创建跨业务的通用列目录。
- 操作的名称、文案、图标、顺序、显示和禁用条件都在列工厂中定义，通过 `type: 'operation'`、`operationConfigure.actions` 交给组件渲染。页面只传入权限、忙碌状态及业务回调，不在入口文件组装操作数组，也不用 `cellRender` 手写操作按钮。
- 请求、确认弹窗和状态变更继续由页面或业务 Hook 处理。提取列配置时，保留权限限制、行级禁用条件、操作顺序和确认流程。
- 动态列使用 `useMemo` 并列全依赖，保证权限、请求状态和回调变化后使用最新配置；搜索配置独立放在 `getSearchItems.tsx`。

## MaProTableOptions

| 参数                | 说明                                     | 类型                                                                                                               | 默认值       |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------ |
| `id`                | 组件实例标识；未提供时自动生成           | `string`                                                                                                           | 自动生成     |
| `header`            | 默认头部显示、主标题和副标题             | `{ show?: boolean \| (() => boolean); mainTitle?: string \| (() => string); subTitle?: string \| (() => string) }` | -            |
| `selection`         | 选择、跨页选择和文案配置                 | `MaProTableOptions<T>['selection']`                                                                                | -            |
| `toolbar`           | 是否显示工具栏                           | `boolean \| (() => boolean)`                                                                                       | 根据插槽推断 |
| `toolStates`        | 按名称控制注册工具，未配置的工具默认显示 | `Record<string, boolean \| (() => boolean)>`                                                                       | `{}`         |
| `requestOptions`    | 请求方法、分页参数和响应解析             | `MaProTableOptions<T>['requestOptions']`                                                                           | -            |
| `onSearchSubmit`    | 搜索提交前转换参数                       | `(form: T) => Record<string, unknown> \| void`                                                                     | -            |
| `onSearchReset`     | 重置提交前转换参数                       | `(form: T) => Record<string, unknown> \| void`                                                                     | -            |
| `tableOptions`      | 透传给 `MaTable` 的配置                  | `MaTableOptions<T>`                                                                                                | `{}`         |
| `searchOptions`     | 搜索区显示、默认值、折叠和按钮配置       | `MaSearchOptions`                                                                                                  | `{}`         |
| `searchFormOptions` | 搜索区表单布局配置                       | `MaFormOptions`                                                                                                    | `{}`         |
| `className`         | 配置项中的根 class                       | `string`                                                                                                           | -            |

`actionBtnPosition` 和 `adaptionOffsetBottom` 仍存在于类型中，但当前 React 组件不会读取它们；页面动作位置应直接使用 `header`、`toolbarLeft` 或 `toolbarRight` 插槽。

## 标签切换

`MaProTable` 将 `tabs` 原样传给 `MaTable`，标签样式和选中态由 `MaTable` 负责。支持标签标题、数量、禁用状态、受控 `value`、非受控 `defaultValue` 和 `onValueChange` 回调；原先 `tabs={<Tabs ... />}` 的用法继续兼容。

```tsx
<MaProTable
  ref={tableRef}
  schema={schema}
  options={options}
  tabs={{
    value: resultStatus,
    ariaLabel: '授权结果',
    items: [
      { value: 'success', label: '成功', count: summary.suc },
      { value: 'fail', label: '失败', count: summary.fail },
    ],
    onValueChange: value => {
      setResultStatus(value)
      tableRef.current?.search({ result_status: value })
    },
  }}
/>
```

切换事件只通知调用方；需要重新查询时，在回调中调用 `search()`，将页码重置为 1 并带上新的筛选条件。初次请求的筛选条件仍通过 `options.requestOptions.requestParams` 设置。`data` 由页面控制时，由页面更新对应数据。

完整字段见 [MaTable 标签切换](../ma-table/README.md#标签切换)。`MaTableTabsConfig`、`MaTableTabItem` 和 `MaTableTabValue` 均可从两个组件的公共入口导入。标签切换只管理表格交互，具体业务筛选由调用方定义。

## 搜索区

搜索字段与响应数据行不同时，使用 `MaProTable<Row, SearchForm>`；相应的 `MaProTableSchema`、`MaProTableOptions`、`MaProTableColumns` 和 `MaProTableExpose` 也接受第二个泛型。单参数用法仍默认搜索模型与数据行模型一致。

当 `schema.searchItems` 至少包含一个可见字段且 `options.searchOptions.show` 未关闭时，`MaProTable` 会在表格工具栏上方渲染 `MaSearch`。提交和重置都会将页码重置为第 1 页并重新请求；`onSearchSubmit`、`onSearchReset` 可以把表单值转换为接口参数。

## 请求与响应

应用中的请求模式表格由 `AppProviders` 注入的 Query 状态管理器持有响应数据；组件只管理分页、搜索和选择状态。独立使用组件时保留本地请求模式。`data`、`total`、`loading` 和 `error` 可由外部查询 Hook 控制。

普通请求函数应把第二个参数 `signal?: AbortSignal` 传给 HTTP 客户端。资源 API 自带取消和 `queryOptions` 时直接传入函数（如 `api: pageUsers`）。切换数据源、隐藏或卸载表格时会释放请求订阅；共享资源请求的取消由 Query 和其他活动消费者共同决定。

```ts
const options: MaProTableOptions<UserRow> = {
  requestOptions: {
    api: pageUsers,
    autoRequest: true,
    requestParams: { status: 1 },
    requestPage: {
      pageName: 'page',
      sizeName: 'page_size',
      size: 20,
    },
    response: {
      dataKey: 'list',
      totalKey: 'total',
    },
    responseDataHandler: record => record.list as UserRow[],
  },
}
```

### requestOptions

| 字段                   | 说明                                         | 类型                                          | 默认值                  |
| ---------------------- | -------------------------------------------- | --------------------------------------------- | ----------------------- |
| `api`                  | 请求函数，可携带资源 `queryOptions`          | `MaProTableApi`；接收 `params`、可选 `signal` | 必填                    |
| `requestKey`           | 数据源标识；闭包捕获的查询范围改变时同步更新 | `string \| number`                            | -                       |
| `paramsTransform`      | 列表与导出共用的参数转换                     | `(params) => Record<string, unknown>`         | -                       |
| `autoRequest`          | 是否在挂载后首次请求                         | `boolean`                                     | `true`（存在 `api` 时） |
| `requestParams`        | 固定请求参数                                 | `Record<string, unknown>`                     | `{}`                    |
| `requestPage.pageName` | 页码参数名                                   | `string`                                      | `'page'`                |
| `requestPage.sizeName` | 每页数量参数名                               | `string`                                      | `'page_size'`           |
| `requestPage.size`     | 初始每页数量                                 | `number`                                      | `10`                    |
| `response.dataKey`     | 列表字段路径                                 | `string`                                      | `'list'`                |
| `response.totalKey`    | 总数字段路径                                 | `string`                                      | `'total'`               |
| `responseDataHandler`  | 对解析出的响应记录做二次转换                 | `(record: Record<string, unknown>) => T[]`    | -                       |

响应解析最多沿 `data` 向下读取多层，列表可以是配置路径指向的数组，也可以回退到 `list`、`items` 或 `data` 数组。请求失败时，组件显示错误区域并清空当前数据。

## 分页流程

1. 组件把固定参数、运行时参数、页码和每页数量合并后调用 `requestOptions.api`。
2. 通过实例方法 `search()` 或翻页都会更新当前页并重新请求。
3. 请求序列号保证较早返回的响应不会覆盖较新的请求结果。

`setRequestParams(params, requestNow)` 和 `changeApi(api, requestNow)` 的 `requestNow` 默认值为 `true`；传 `false` 可以只更新配置而不立即请求。

`schema.tableColumns`、`schema.searchItems` 和 `options` 的新 props 会同步到子组件；ref 修改保留到对应 props 换成新引用。请求参数、映射或 `requestKey` 的有效变化会使旧请求失效，并在 `autoRequest` 开启时自动请求；仅重建等价配置对象不会重复请求。`tableOptions.pagination.onChange/onCurrentChange/onSizeChange` 会保留并调用，`onChange` 在内部页码更新后、请求发出前执行。

ReUI 和 TanStack 扩展配置放在 `options.tableOptions` 内，沿用 [MaTable 的类型化入口](../ma-table/README.md)。例如 `options.tableOptions.dataGridProps.tableLayout.columnsResizable`，原生实例通过 `ref.getTableRef()?.getTableInstance()` 获取。

## 工具栏

```tsx
<MaProTable
  schema={schema}
  options={{ toolbar: true }}
  toolbarLeft={
    <div className="flex gap-2">
      <Button>新增</Button>
      <Button variant="destructive">批量删除</Button>
    </div>
  }
  toolbarCenter={<span>当前共 20 条</span>}
  toolbarRight={<Button variant="outline">刷新</Button>}
/>
```

表格内的业务动作可以按职责放入对应插槽：批量操作放左侧，统计或上下文信息放中间，刷新、导出和设置放右侧。支持创建的列表在表格左侧保留创建按钮，并放在批量删除之前；导航栏右侧可同时提供创建入口，两处复用相同的权限、禁用条件和创建回调。`MaProTable` 不会再额外创建第二套工具栏布局，也不会修改 `MaTable` 的官方样式。

### 插件工具自动注入

应用插件在 `install(runtime)` 中调用 `runtime.proTableToolbars.register({ name, order, show, render })` 注册工具，并返回清理函数；`AppProviders` 注入 `ProTableToolbarsContext`。`show` 可按当前表格配置判断适用范围；`render` 接收 `{ options, tableRef }`，用于获取最新配置、刷新表格或调用实例方法。注册工具按 `order` 排序，统一放在右侧默认刷新按钮之后、`afterToolbar` 之前。基础表格组件不依赖任何具体业务插件。

已挂载的表格会响应注册、同名替换和注销。`runtime.proTableToolbars.register` 返回本次注册的清理函数，也可以通过 `runtime.proTableToolbars.remove(name)` 注销。独立组件可用 `createProTableToolbars()` 和 `ProTableToolbarsContext.Provider`；全局 `registerProTableToolbar/removeProTableToolbar` 仅服务无应用 Provider 的兼容场景。页面通过 `options.toolStates[工具名称]` 设置布尔值或函数控制显示，不需要手动渲染插件组件；`toolbar: false` 会关闭整个工具栏。

导入导出插件使用原版名称 `i-hugeicons:folder-import`、`i-hugeicons:folder-export`。页面配置及接口推导规则见 [React 导入导出插件](../../plugins/west/importExportPro/README.md)。

### 导航栏右侧创建入口

需要将「创建」放到导航栏右侧时，在页面使用现有 `useHeaderActions`。页面负责权限、创建弹窗和保存后的表格刷新，`MaProTable` 负责列表。此插槽由应用布局的 `HeaderActionsProvider` 提供，页面卸载后自动清理。

```tsx
import { Button } from '@/components/reui/primitives/button'
import { MaProTable, type MaProTableProps } from '@/components/ma-pro-table'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'

type UserListPageProps = Pick<MaProTableProps<UserRow>, 'schema' | 'options'> & {
  canCreate: boolean
  onCreate: () => void
}

export function UserListPage({ schema, options, canCreate, onCreate }: UserListPageProps) {
  useHeaderActions(
    canCreate ? (
      <Button type="button" onClick={onCreate}>
        创建
      </Button>
    ) : null,
  )

  return (
    <MaProTable<UserRow>
      schema={schema}
      options={{ ...options, toolbar: true }}
      toolbarLeft={
        canCreate ? (
          <Button type="button" onClick={onCreate}>
            创建
          </Button>
        ) : null
      }
    />
  )
}
```

Hook 应放在页面的条件返回之前；存在页面访问权限时，需同时满足访问与创建权限才注入按钮。导航栏入口与 `toolbarLeft` 中的创建按钮同时保留。基础用户管理页 `src/modules/base/user/views/index.tsx` 已采用此方式。

## 实例方法

```tsx
const tableRef = useRef<MaProTableExpose<UserRow>>(null)

tableRef.current?.setRequestParams({ status: 1 }, true)
await tableRef.current?.refresh()
```

| 方法                                    | 说明                                                            | 返回值                                               |
| --------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| `getSearchRef()`                        | 获取内部 `MaSearch` 实例                                        | `MaSearchExpose<T> \| null`                          |
| `getTableRef()`                         | 获取内部 `MaTable` 实例                                         | `MaTableExpose<T> \| null`                           |
| `getElTableStates()`                    | 获取当前数据、加载状态和选中行                                  | `{ data: T[]; loading: boolean; selectedRows: T[] }` |
| `refresh()`                             | 按当前参数重新请求                                              | `Promise<void>`                                      |
| `requestData()`                         | 执行一次请求                                                    | `Promise<void>`                                      |
| `changeApi(api, requestNow?)`           | 更换请求函数                                                    | `void`                                               |
| `setRequestParams(params, requestNow?)` | 合并请求参数                                                    | `void`                                               |
| `setTableColumns(columns)`              | 替换表格列                                                      | `void`                                               |
| `getTableColumns()`                     | 获取表格列                                                      | `MaProTableColumns<T>[]`                             |
| `setSearchForm(form)`                   | 合并设置搜索表单                                                | `void`                                               |
| `getSearchForm()`                       | 获取搜索表单                                                    | `T`                                                  |
| `getRequestParams()`                    | 获取固定参数和已提交筛选，经 `paramsTransform` 归一化后去除分页 | `Record<string, unknown>`                            |
| `search(params?)`                       | 合并额外参数并立即搜索                                          | `void`                                               |
| `setProTableOptions(options)`           | 动态合并组件配置                                                | `void`                                               |
| `getProTableOptions()`                  | 获取当前组件配置                                                | `MaProTableOptions<T>`                               |
| `resizeHeight()`                        | 保留的高度重算接口                                              | `Promise<void>`                                      |
| `getCurrentId()`                        | 获取组件实例 ID                                                 | `string`                                             |

当前 `resizeHeight()` 只保留调用契约，不执行额外测量；自适应高度应直接使用 `MaTable` 的 `height`、`maxHeight` 或容器布局。

## 选择状态

`selection.crossPage` 为真时，组件会在请求数据变化后保留跨页选择，并优先使用 `selection.rowKey`，否则使用 `tableOptions.rowKey`，最后回退到 `id` 或 `key`。

```tsx
<MaProTable
  schema={schema}
  options={{
    selection: {
      crossPage: true,
      rowKey: row => row.id,
      selectedText: count => `已选择 ${count} 项`,
    },
    tableOptions: { rowKey: row => row.id },
  }}
  onSelectionChange={rows => {
    exportRows(rows)
  }}
/>
```

## 目录职责

- `index.ts`：唯一公开入口。
- `types/index.ts`：组合组件、请求、选择、工具栏和实例类型。
- `components/ma-pro-table.tsx`：请求状态和页面布局编排。
- `utils/pro-table-utils.ts`：响应列表、总数、文案和显示状态辅助函数。

## 相关链接

- [MineAdmin MaProTable 官方文档](https://doc.mineadmin.com/libs/ma-pro-table/latest/)

## 受控数据展示

`data?: T[]` 和 `loading?: boolean` 可由页面传入，分别优先于内部请求数据和加载状态。受控模式下总数取 `tableOptions.pagination.total`，未指定时取 `data.length`；默认保留服务端分页约定。完整本地数组可通过 `tableOptions.manualPagination: false` 分页，隐藏分页器则展示整份数组。

传入 `data` 后，总数仍需放在 `options.tableOptions.pagination.total`；仅传顶层 `total` 不会覆盖受控数据模式的分页总数。部门树表由模块管理组织树、折叠、请求和分页：先按顶级部门切页，再展开当前页子树，通过 `data={visibleRows}` 传入。页码、每页数量、顶级部门总数、禁用状态及 `onChange` 可直接放在 `options.tableOptions.pagination`；既有 `getTableRef().setPagination()` 调用继续保留。子部门不单独占用分页名额。搜索使用 `onSearchSubmit/onSearchReset`，刷新通过 `toolbarRight` 提供，此类页面不配置 `requestOptions.api`。

## 请求参数与导出契约

列表与导出共享 `requestOptions.paramsTransform(params)`。API 包装中存在 trim、空值剔除或业务字段改名时，将同一纯函数配置在这里，避免列表与导出范围不一致。不要在转换函数中改变分页键；自定义分页键由 `requestPage.pageName/sizeName` 声明。接口函数只负责请求及响应解析。

`getRequestParams()` 返回当前固定参数和已提交筛选；搜索框尚未提交的编辑值不会影响导出。默认筛选、`onSearchSubmit` 和 `onSearchReset` 返回的参数都会进入此契约。

## 工程结构

根目录 `index.ts` 仅提供公共导出，类型集中到 `types/`。结构约束见 [Ma 组件工程规范](../../../docs/MA_COMPONENTS.md)。

| 目录 | 职责 | 文件 |
| --- | --- | --- |
| `components/` | 展示组件 | ma-pro-table.tsx |
| `context/` | React 接入 | request-context.ts, toolbars-context.ts |
| `types/` | 公共及内部类型 | index.ts, request.ts |
| `utils/` | 转换与状态工厂 | pro-table-utils.ts, toolbars.ts |

使用 `pnpm run check:ma` 验证结构、类型、Lint 和行为；迁移验证同时覆盖应用消费者与依赖边界。
