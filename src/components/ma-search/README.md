# MaSearch

`MaSearch` 是基于 `MaForm` 的 React 搜索面板。它负责搜索项布局、标签内置显示、响应式列数、折叠状态以及搜索/重置操作；请求、路由和业务参数转换由调用方负责。

本文按当前 `web/src/components/ma-search` 源码整理。组件使用项目内的 ReUI/Base UI 控件，不依赖 Vue、Element Plus 或独立的 `@mineadmin/search` 运行时包。

## 快速开始

```tsx
import { useCallback, useRef } from 'react'
import { MaSearch, type MaSearchExpose, type MaSearchItem } from '@/components/ma-search'

interface UserSearch {
  keyword: string
  status: string
}

export function UserSearchPanel() {
  const searchRef = useRef<MaSearchExpose<UserSearch>>(null)
  const searchItems: MaSearchItem<UserSearch>[] = [
    {
      label: '关键词',
      prop: 'keyword',
      render: 'Input',
      renderProps: { placeholder: '搜索用户名或邮箱' },
    },
    {
      label: '状态',
      prop: 'status',
      render: 'Select',
      renderProps: {
        options: [
          { label: '启用', value: '1' },
          { label: '禁用', value: '2' },
        ],
      },
    },
  ]

  const handleSearch = useCallback(async (form: UserSearch) => {
    await loadUsers(form)
  }, [])

  return (
    <MaSearch
      ref={searchRef}
      searchItems={searchItems}
      options={{ defaultValue: { keyword: '', status: '' }, cols: { lg: 3, xl: 4 } }}
      onSearch={handleSearch}
      onReset={handleSearch}
    />
  )
}
```

输入控件按下 `Enter` 会提交一次搜索。`onReset` 收到的是重置后的表单值，通常可以直接复用列表查询函数。

## 标签位置

默认 `options.labelPlacement` 为 `inside`：

- 文本、密码、数字、日期和时间输入会把标签作为输入框前缀。
- `Select`、`Checkbox`、`Switch` 和 `Radio` 会把标签作为占位文本或无障碍标签。
- 字段标签不会在控件上方重复渲染。

需要传统外置标签时传入 `labelPlacement: 'outside'`，标签会交给 `MaForm` 的 `FieldLabel` 渲染。

## Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `options` | 搜索面板配置 | `MaSearchOptions` | `{}` |
| `formOptions` | 透传给内部 `MaForm` 的配置 | `MaFormOptions` | `{}` |
| `searchItems` | 搜索项配置数组 | `MaSearchItem<T>[]` | `[]` |
| `items` | `searchItems` 的兼容别名 | `MaSearchItem<T>[]` | `[]` |
| `className` | 面板根节点 class | `string` | - |
| `children` | 追加到字段区域后的内容 | `ReactNode` | - |
| `beforeActions` | 插入到搜索、重置按钮之前 | `ReactNode` | - |
| `afterActions` | 插入到搜索、重置按钮之后 | `ReactNode` | - |
| `actions` | 替换默认搜索、重置按钮组；折叠按钮仍按配置追加 | `ReactNode` | - |
| `onSearch` | 搜索提交回调 | `(form: T) => void | Promise<void>` | - |
| `onReset` | 重置回调 | `(form: T) => void | Promise<void>` | - |
| `onFold` | 折叠状态变化回调 | `(folded: boolean) => void` | - |

## MaSearchOptions

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `defaultValue` | 搜索表单初始值 | `MaSearchModel` | `{}` |
| `cols` | 不同视口下的网格列数 | `{ xs?: number; sm?: number; md?: number; lg?: number; xl?: number }` | `1/2/2/3/4` |
| `labelPlacement` | 标签位置 | `'inside' | 'outside'` | `'inside'` |
| `fold` | 是否以折叠状态开始 | `boolean` | `false` |
| `foldButtonShow` | 是否显示折叠按钮 | `boolean` | `true` |
| `foldRows` | 折叠时保留的网格行数 | `number` | `2` |
| `show` | 是否显示整个搜索面板，也可以是函数 | `boolean | (() => boolean)` | `true` |
| `text.searchBtn` | 搜索按钮文案 | `string | (() => string)` | `'搜索'` |
| `text.resetBtn` | 重置按钮文案 | `string | (() => string)` | `'重置'` |
| `text.isFoldBtn` | 当前展开时的折叠文案 | `string | (() => string)` | `'折叠'` |
| `text.notFoldBtn` | 当前折叠时的展开文案 | `string | (() => string)` | `'展开'` |
| `searchBtnProps` | 搜索按钮属性 | `Record<string, unknown>` | - |
| `resetBtnProps` | 重置按钮属性 | `Record<string, unknown>` | - |

视口断点为 `<768px`、`768-991px`、`992-1199px`、`1200-1919px` 和 `>=1920px`。`foldRows` 按当前响应式列数计算，而不是固定字段数量。

## MaSearchItem

`MaSearchItem<T>` 继承 `MaFormItem<T>`，因此支持 `label`、`prop`、`render`、`component`、`renderProps`、`itemProps`、`show` 和 `hide` 等表单能力，并额外提供：

| 参数 | 说明 | 类型 |
| --- | --- | --- |
| `span` | 搜索项在当前网格中跨越的列数 | `number` |
| `offset` | 搜索项左侧偏移的列数 | `number` |

`cols` 优先于 `span` 计算网格占位；`hide` 为真或折叠行超出 `foldRows` 时，字段会被隐藏。

## 操作区插槽

```tsx
<MaSearch
  searchItems={searchItems}
  beforeActions={<Button variant="outline">导出</Button>}
  afterActions={<Button variant="ghost">保存筛选</Button>}
/>
```

| 插槽 | 说明 |
| --- | --- |
| `children` | 交给内部 `MaForm`，位于字段之后 |
| `actions` | 替换搜索、重置按钮组；折叠按钮仍按配置追加 |
| `beforeActions` | 插入到搜索按钮之前 |
| `afterActions` | 插入到重置按钮之后 |

未传 `actions` 时，组件会按“前置内容 → 搜索 → 重置 → 后置内容 → 折叠按钮”的顺序渲染操作区。搜索和重置按钮组保持左对齐，并使用表单网格间距。

## 折叠行为

`fold: true` 表示折叠；运行时 `getFold()` 返回 `true` 也表示当前折叠。`foldToggle()` 会切换状态，折叠按钮同步更新 `aria-expanded`，字段显隐会传到实际表单。新的 `searchItems/items/options/formOptions` props 会生效，ref 修改保留到对应 props 换成新引用。`options.fold` 改变时同步折叠状态，其他配置更新不重置用户已切换的状态。字段的内置控件参数遵循 [MaForm 类型契约](../ma-form/README.md)。

```tsx
searchRef.current?.foldToggle()
const folded = searchRef.current?.getFold()
```

## 事件

| 事件 | 说明 | 参数 |
| --- | --- | --- |
| `onSearch` | 点击搜索或输入框回车后触发 | `form: T` |
| `onReset` | 点击重置后触发 | `form: T` |
| `onFold` | 折叠状态改变后触发 | `folded: boolean` |

## 实例方法

| 方法 | 说明 | 返回值 |
| --- | --- | --- |
| `getMaFormRef()` | 获取内部 `MaForm` 实例 | `MaFormExpose<T> | null` |
| `foldToggle()` | 切换折叠状态 | `void` |
| `getFold()` | 获取当前折叠状态 | `boolean` |
| `setSearchForm(form)` | 合并设置搜索表单；传 `null` 清空 | `void` |
| `getSearchForm()` | 获取当前搜索表单 | `T` |
| `setShowState(show)` | 设置面板显示状态 | `void` |
| `getShowState()` | 获取面板显示状态 | `boolean` |
| `setOptions(options)` | 合并更新搜索配置 | `void` |
| `getOptions()` | 获取搜索配置 | `MaSearchOptions` |
| `setFormOptions(options)` | 合并更新内部表单配置 | `void` |
| `getFormOptions()` | 获取内部表单配置 | `MaFormOptions` |
| `setItems(items)` | 替换搜索项 | `void` |
| `getItems()` | 获取搜索项 | `MaSearchItem<T>[]` |
| `appendItem(item)` | 追加搜索项 | `void` |
| `removeItem(prop)` | 按字段路径删除搜索项 | `void` |
| `getItemByProp(prop)` | 按字段路径查找搜索项 | `MaSearchItem<T> | null` |
| `setSearchBtnProps(props)` | 合并更新搜索按钮属性 | `void` |
| `setResetBtnProps(props)` | 合并更新重置按钮属性 | `void` |

## 目录职责

- `index.ts`：唯一公开入口。
- `types/index.ts`：搜索项、配置和实例类型。
- `components/ma-search.tsx`：搜索状态、响应式布局和操作区渲染。
- `utils/search-utils.ts`：按钮文案等无副作用辅助函数。

## 相关链接

- [MineAdmin MaSearch 官方文档](https://doc.mineadmin.com/libs/ma-search/latest/)
