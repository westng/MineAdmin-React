# MaProTable

`MaProTable` 是 React 端的列表页组合组件。当前版本按目标站的 Frame 结构组合 `MaSearch`、`MaTable`、请求状态、响应解析、分页和选择状态；页面只需要提供 `schema`、`options` 和业务插槽。

本文按当前 `web/src/components/ma-pro-table` 源码整理。它使用项目内的 `MaTable` 和 ReUI/Base UI，最外层统一由官方 `Frame` 包裹；组件只编排表格布局，不覆盖 `MaTable` 自身的样式配置。

## 快速开始

```tsx
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  MaProTable,
  type MaProTableApi,
  type MaProTableExpose,
  type MaProTableSchema,
} from '@/components/ma-pro-table'

interface UserRow {
  id: number
  username: string
  status: number
}

const requestUsers: MaProTableApi = params => userApi.page(params)
const schema: MaProTableSchema<UserRow> = {
  tableColumns: [
    { prop: 'username', label: '用户名' },
    { prop: 'status', label: '状态' },
  ],
}

export function UserList() {
  const tableRef = useRef<MaProTableExpose<UserRow>>(null)

  return (
    <MaProTable<UserRow>
      ref={tableRef}
      schema={schema}
      options={{
        toolbar: true,
        requestOptions: {
          api: requestUsers,
          requestPage: { pageName: 'page', sizeName: 'page_size', size: 20 },
          response: { dataKey: 'list', totalKey: 'total' },
        },
        tableOptions: { rowKey: row => row.id },
      }}
      toolbarLeft={<Button>新增用户</Button>}
      toolbarRight={<Button variant="outline" onClick={() => void tableRef.current?.refresh()}>刷新</Button>}
    />
  )
}
```

配置 `requestOptions.api` 后，默认会在挂载后请求一次；`autoRequest: false` 可以关闭首次请求。翻页和调用 `refresh()` 都会按当前参数重新请求。

## 组件关系

```text
MaProTable
└── Frame
    └── FramePanel
        └── MaTable   schema.tableColumns / options.tableOptions
            ├── headerContent: MaSearch + Separator
            └── table / toolbar / pagination
```

搜索区由 `MaProTable` 组合为 `MaSearch + Separator`，通过 `MaTable.headerContent` 插槽放在表格工具栏上方；搜索区默认复用面板内边距，不额外创建卡片边框。工具栏区域由内部 `MaTable` 唯一渲染。`toolbarLeft`、`toolbarCenter`、`toolbarRight` 分别透传到表格左、中、右插槽；`toolbar` 是中间插槽的兼容别名。`beforeToolbar` 并入左侧，`afterToolbar` 并入右侧。

## Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `schema` | 搜索项和表格列配置 | `MaProTableSchema<T>` | `{}` |
| `options` | 请求、搜索、表格和选择配置 | `MaProTableOptions<T>` | `{}` |
| `data` | 页面控制的展示数据，优先于内部请求数据 | `T[]` | - |
| `loading` | 页面控制的加载状态，优先于内部请求状态 | `boolean` | - |
| `variant` | 兼容保留的外观标识；当前布局统一使用 `Frame` + `FramePanel`，不会覆盖表格自身样式 | `'default' | 'card'` | `'default'` |
| `className` | 组件根节点 class | `string` | - |
| `header` | 自定义头部内容 | `ReactNode` | - |
| `tabs` | 头部下方标签区域 | `ReactNode` | - |
| `toolbarLeft` | 工具栏左侧内容 | `ReactNode` | - |
| `toolbarCenter` | 工具栏中间内容 | `ReactNode` | - |
| `toolbarRight` | 工具栏右侧内容 | `ReactNode` | - |
| `toolbar` | `toolbarCenter` 的兼容别名 | `ReactNode` | - |
| `beforeToolbar` | 追加到工具栏左侧前面 | `ReactNode` | - |
| `afterToolbar` | 追加到工具栏右侧后面 | `ReactNode` | - |
| `empty` | 表格空数据内容 | `ReactNode` | - |
| `onSelectionChange` | 选择行变化回调 | `(rows: T[]) => void` | - |

当没有显式中间和右侧内容时，组件会把默认刷新按钮放在右侧；显式提供 `toolbarRight` 后不会额外注入刷新按钮。

## MaProTableSchema

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| `searchItems` | 搜索区字段配置；存在可见字段时渲染 `MaSearch` | `MaSearchItem<T>[]` |
| `tableColumns` | 透传给 `MaTable` 的列配置 | `MaProTableColumns<T>[]` |

`MaProTableColumns<T>` 继承 `MaTableColumn<T>`。类型中额外保留 `toolHide`、`cellRenderTo` 和 `operationConfigure`，但当前 React 实现不会自动生成列设置、渲染插件或操作列；需要这些行为时，请直接使用 `cellRender`、`headerRender` 和业务组件组合。

## MaProTableOptions

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `id` | 组件实例标识；未提供时自动生成 | `string` | 自动生成 |
| `header` | 默认头部显示、主标题和副标题 | `{ show?: boolean | (() => boolean); mainTitle?: string | (() => string); subTitle?: string | (() => string) }` | - |
| `selection` | 选择、跨页选择和文案配置 | `MaProTableOptions<T>['selection']` | - |
| `toolbar` | 是否显示工具栏 | `boolean | (() => boolean)` | 根据插槽推断 |
| `requestOptions` | 请求方法、分页参数和响应解析 | `MaProTableOptions<T>['requestOptions']` | - |
| `onSearchSubmit` | 搜索提交前转换参数 | `(form: T) => Record<string, unknown> | void` | - |
| `onSearchReset` | 重置提交前转换参数 | `(form: T) => Record<string, unknown> | void` | - |
| `tableOptions` | 透传给 `MaTable` 的配置 | `MaTableOptions<T>` | `{}` |
| `searchOptions` | 搜索区显示、默认值、折叠和按钮配置 | `MaSearchOptions` | `{}` |
| `searchFormOptions` | 搜索区表单布局配置 | `MaFormOptions` | `{}` |
| `className` | 配置项中的根 class | `string` | - |

`actionBtnPosition` 和 `adaptionOffsetBottom` 仍存在于类型中，但当前 React 组件不会读取它们；页面动作位置应直接使用 `header`、`toolbarLeft` 或 `toolbarRight` 插槽。

## 搜索区

当 `schema.searchItems` 至少包含一个可见字段且 `options.searchOptions.show` 未关闭时，`MaProTable` 会在表格工具栏上方渲染 `MaSearch`。提交和重置都会将页码重置为第 1 页并重新请求；`onSearchSubmit`、`onSearchReset` 可以把表单值转换为接口参数。

## 请求与响应

```ts
const options: MaProTableOptions<UserRow> = {
  requestOptions: {
    api: params => userApi.page(params),
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

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `api` | 接收完整请求参数的请求函数 | `(params: Record<string, unknown>) => unknown | Promise<unknown>` | 必填 |
| `autoRequest` | 是否在挂载后首次请求 | `boolean` | `true`（存在 `api` 时） |
| `requestParams` | 固定请求参数 | `Record<string, unknown>` | `{}` |
| `requestPage.pageName` | 页码参数名 | `string` | `'page'` |
| `requestPage.sizeName` | 每页数量参数名 | `string` | `'page_size'` |
| `requestPage.size` | 初始每页数量 | `number` | `10` |
| `response.dataKey` | 列表字段路径 | `string` | `'list'` |
| `response.totalKey` | 总数字段路径 | `string` | `'total'` |
| `responseDataHandler` | 对解析出的响应记录做二次转换 | `(record: Record<string, unknown>) => T[]` | - |

响应解析最多沿 `data` 向下读取多层，列表可以是配置路径指向的数组，也可以回退到 `list`、`items` 或 `data` 数组。请求失败时，组件显示错误区域并清空当前数据。

## 分页流程

1. 组件把固定参数、运行时参数、页码和每页数量合并后调用 `requestOptions.api`。
2. 通过实例方法 `search()` 或翻页都会更新当前页并重新请求。
3. 请求序列号保证较早返回的响应不会覆盖较新的请求结果。

`setRequestParams(params, requestNow)` 和 `changeApi(api, requestNow)` 的 `requestNow` 默认值为 `true`；传 `false` 可以只更新配置而不立即请求。

## 工具栏

```tsx
<MaProTable
  schema={schema}
  options={{ toolbar: true }}
  toolbarLeft={<div className="flex gap-2"><Button>新增</Button><Button variant="destructive">批量删除</Button></div>}
  toolbarCenter={<span>当前共 20 条</span>}
  toolbarRight={<Button variant="outline">刷新</Button>}
/>
```

表格内的业务动作可以按职责放入对应插槽：批量操作放左侧，统计或上下文信息放中间，刷新、导出和设置放右侧。支持创建的列表在表格左侧保留创建按钮，并放在批量删除之前；导航栏右侧可同时提供创建入口，两处复用相同的权限、禁用条件和创建回调。`MaProTable` 不会再额外创建第二套工具栏布局，也不会修改 `MaTable` 的官方样式。

### 导航栏右侧创建入口

需要将「创建」放到导航栏右侧时，在页面使用现有 `useHeaderActions`。页面负责权限、创建弹窗和保存后的表格刷新，`MaProTable` 负责列表。此插槽由应用布局的 `HeaderActionsProvider` 提供，页面卸载后自动清理。

```tsx
import { Button } from '@/components/ui/button'
import { MaProTable, type MaProTableProps } from '@/components/ma-pro-table'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'

type UserListPageProps = Pick<MaProTableProps<UserRow>, 'schema' | 'options'> & {
  canCreate: boolean
  onCreate: () => void
}

export function UserListPage({ schema, options, canCreate, onCreate }: UserListPageProps) {
  useHeaderActions(canCreate ? <Button type="button" onClick={onCreate}>创建</Button> : null)

  return <MaProTable<UserRow> schema={schema} options={{ ...options, toolbar: true }} toolbarLeft={canCreate ? <Button type="button" onClick={onCreate}>创建</Button> : null} />
}
```

Hook 应放在页面的条件返回之前；存在页面访问权限时，需同时满足访问与创建权限才注入按钮。导航栏入口与 `toolbarLeft` 中的创建按钮同时保留。飞书连接页 `web/src/modules/feishu/connection/views/FeishuConnectionPage.tsx` 已采用此方式。

## 实例方法

```tsx
const tableRef = useRef<MaProTableExpose<UserRow>>(null)

tableRef.current?.setRequestParams({ status: 1 }, true)
await tableRef.current?.refresh()
```

| 方法 | 说明 | 返回值 |
| --- | --- | --- |
| `getSearchRef()` | 获取内部 `MaSearch` 实例 | `MaSearchExpose<T> | null` |
| `getTableRef()` | 获取内部 `MaTable` 实例 | `MaTableExpose<T> | null` |
| `getElTableStates()` | 获取当前数据、加载状态和选中行 | `{ data: T[]; loading: boolean; selectedRows: T[] }` |
| `refresh()` | 按当前参数重新请求 | `Promise<void>` |
| `requestData()` | 执行一次请求 | `Promise<void>` |
| `changeApi(api, requestNow?)` | 更换请求函数 | `void` |
| `setRequestParams(params, requestNow?)` | 合并请求参数 | `void` |
| `setTableColumns(columns)` | 替换表格列 | `void` |
| `getTableColumns()` | 获取表格列 | `MaProTableColumns<T>[]` |
| `setSearchForm(form)` | 合并设置搜索表单 | `void` |
| `getSearchForm()` | 获取搜索表单 | `T` |
| `search(params?)` | 合并额外参数并立即搜索 | `void` |
| `setProTableOptions(options)` | 动态合并组件配置 | `void` |
| `getProTableOptions()` | 获取当前组件配置 | `MaProTableOptions<T>` |
| `resizeHeight()` | 保留的高度重算接口 | `Promise<void>` |
| `getCurrentId()` | 获取组件实例 ID | `string` |

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
  onSelectionChange={rows => { exportRows(rows) }}
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

`data?: T[]` 和 `loading?: boolean` 可由页面传入，分别优先于组件内部的请求数据和加载状态；`getElTableStates()` 返回实际展示的数据与状态。受控模式下总数取 `tableOptions.pagination.total`，未指定时取 `data.length`，分页仍使用服务端分页约定，不会自动切分传入数据。

部门树表由模块管理组织树、折叠、请求和分页：先按顶级部门切页，再展开当前页子树，将结果通过 `data={visibleRows}` 传入。配置 `tableOptions.showPagination: true`，使用公开的 `getTableRef().setPagination()` 同步页码、每页数量、顶级部门总数、禁用状态和 `onChange` 回调；子部门不单独占用分页名额。搜索通过 `onSearchSubmit`、`onSearchReset` 通知页面并回到第一页，刷新通过 `toolbarRight` 提供。此类页面不配置 `requestOptions.api`，避免同时维护两套请求。
