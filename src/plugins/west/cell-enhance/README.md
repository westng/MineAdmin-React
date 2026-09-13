# Cell Enhance

React 表格单元格插件，直接维护在本目录。提供徽章 `badge` 和头像信息 `avatar-info` 两种类型，复用项目的 `@/components/reui/badge` 与 `@/components/ui/avatar`。

## 表格用法

`MaTable` 和 `MaProTable` 统一通过 `cellRenderTo` 使用。宿主启动时自动发现本插件，并在 `install` 中注册 `west/cell-enhance` 渲染器。

```tsx
import type { MaProTableColumns } from '@/components/ma-pro-table'
import type { CellEnhanceRenderTo } from '$/west/cell-enhance'

type Row = { id: number; status: number; roles: string[] }

const columns: MaProTableColumns<Row>[] = [
  {
    label: '状态',
    prop: 'status',
    cellRenderTo: {
      name: 'west/cell-enhance',
      props: {
        type: 'badge',
        props: {
          radius: 'full',
          dot: true,
          dictName: 'system-status',
        },
      },
    } satisfies CellEnhanceRenderTo<Row>,
  },
  {
    label: '角色',
    prop: 'roles',
    cellRenderTo: {
      name: 'west/cell-enhance',
      props: {
        type: 'badge',
        props: {
          options: [
            { value: 'admin', label: '管理员', variant: 'primary-light' },
            { value: 'member', label: '成员', variant: 'secondary' },
          ],
        },
      },
    } satisfies CellEnhanceRenderTo<Row>,
  },
]
```

换成 `MaTableColumn<Row>[]` 即可用于 `MaTable`。`satisfies` 可选，用于校验渲染器名称、各类单元格参数并提供类型提示。

Badge 直接使用表格解析出的 `context.value`，列的嵌套字段与函数取值仍由表格处理。数组按原顺序显示多个 Badge。

## 头像信息单元格

`type: 'avatar-info'` 对应 `AvatarInfoCell`，按 Avatar + 姓名 + 小徽章 + 副标题的布局组合。默认头像为 32px，姓名使用 `text-sm font-semibold`，徽章使用 `variant="default" size="xs"`，副标题使用 `text-muted-foreground text-xs`。

通过 `fields` 传入当前行的字段名，支持点号分隔的嵌套路径：

```tsx
import type { MaProTableColumns } from '@/components/ma-pro-table'
import type { CellEnhanceRenderTo } from '$/west/cell-enhance'

type UserRow = {
  id: number
  user: { avatar?: string; nickname: string; title?: string }
  membership?: { label: string }
}

const columns: MaProTableColumns<UserRow>[] = [{
  label: '用户',
  prop: 'user.nickname',
  minWidth: 240,
  cellRenderTo: {
    name: 'west/cell-enhance',
    props: {
      type: 'avatar-info',
      props: {
        fields: {
          avatar: 'user.avatar',
          name: 'user.nickname',
          badge: 'membership.label',
          description: 'user.title',
        },
        badgeProps: { variant: 'default', size: 'xs' },
      },
    },
  } satisfies CellEnhanceRenderTo<UserRow>,
}]
```

`fields` 内的字符串是字段路径；同名顶层参数 `avatar`、`name`、`badge`、`description` 是直接展示的值。可以混合使用，显式字段映射优先；映射的字段缺失时按空值处理，不回退到另一个直接值。没有配置 `fields.name` 或 `name` 时，名称使用当前列的值，因此也支持表格函数列。

徽章颜色、文本或交互需要按行变化时，继续使用外层 `props` 回调：

```tsx
cellRenderTo: {
  name: 'west/cell-enhance',
  props: ({ row }) => ({
    type: 'avatar-info',
    props: {
      fields: { avatar: 'user.avatar', description: 'user.title' },
      badge: row.active ? '已启用' : '已停用',
      badgeProps: { variant: row.active ? 'success-light' : 'secondary' },
    },
  }),
}
```

| 参数 | 作用 |
| --- | --- |
| `fields.avatar / name / badge / description` | 头像、名称、徽章、副标题在当前行中的字段路径 |
| `avatar` | 直接传头像 URL，支持空值 |
| `name / badge / description` | 直接传文本或数字；`0` 会正常显示 |
| `fallback` | 头像缺失或加载失败时的文字；默认英文名取首尾单词首字母，单个名称取前两个字符 |
| `emptyText` | 全部内容为空或名称缺失时的占位，默认 `-` |
| `avatarSize` | 复用 Avatar 的 `default`、`sm`、`lg`，默认 `default` |
| `badgeProps` | ReUI Badge 原生展示属性与事件，可配置颜色、尺寸、圆角等 |
| `className / style` 与原生 div 属性 | 配置整体容器；交互事件由调用方提供 |

徽章、副标题为空时不渲染对应元素；所有内容都为空时只显示占位。名称和副标题过长时省略显示，鼠标悬停可查看完整文字。对象、数组、布尔值和非有限数字不会直接渲染成文本；头像只接受字符串 URL。字段映射只读取当前行，不发起用户信息查询，也不修改行数据。

直接使用组件时传展示值即可：

```tsx
import { AvatarInfoCell } from '$/west/cell-enhance'

<AvatarInfoCell
  avatar={user.avatar}
  name={user.nickname}
  badge="专业版"
  description={user.title}
/>
```

完整类型示例见 `examples/avatar-info-columns.tsx`。

## 选项来源

Badge 同时支持两种配置：

- `dictName: 'system-status'`：传字典分类的 `code`，从统一字典仓库获取选项。
- `options: [{ value: 1, label: '启用', variant: 'success-light' }]`：直接传选项数组，每项支持标签、插槽和 Badge 原生属性。

两者同时传入时，`options` 优先；显式 `options: []` 表示没有映射，未匹配的值保持原值，不回退查询字典。两者都省略时也直接显示原值。后续新增需要选项的增强组件沿用这两种入口和优先级。

字典模式通过 `hooks/use-dictionary-options.ts` 订阅 `@/provider/dictionary`。`dictName` 使用分类 `code`，例如 `system-status`、`base-userType` 或后台字典管理中维护的分类编码。本地字典和 `mine-admin/dictionary` 登录钩子加载的远端字典共用该仓库，单元格不会单独请求接口。分类尚未加载、分类不存在或值未匹配时显示原值；提供 `formatValue` 时使用格式化结果。字典写入、替换或清除后，已挂载的单元格自动更新。

匹配字典项后使用其 `label`，并按 `color` 配置 Badge：`primary`、`success`、`warning`、`info` 等映射为相应浅色变体，`danger` 映射为 `destructive-light`。也支持本地 ReUI Badge 的变体名称；`#1677ff` 等 CSS 颜色用作描边 Badge 的文字和边框颜色。字典中的编码、国际化键等元数据不会透传到 DOM。

字典模式下，需要按字典项添加图标、交互或覆盖样式时，使用 `optionProps`：

```tsx
props: {
  type: 'badge',
  props: {
    dictName: 'system-status',
    optionProps: ({ value }) => ({
      variant: String(value) === '1' ? 'success-outline' : 'destructive-outline',
    }),
  },
}
```

## 按当前行配置

外层 `props` 支持函数，可访问 `row`、`rowIndex`、`column`、`value`：

```tsx
cellRenderTo: {
  name: 'west/cell-enhance',
  props: ({ row }) => ({
    type: 'badge',
    props: {
      variant: 'primary-outline',
      render: <button type="button" />,
      onClick: event => {
        event.stopPropagation()
        openDetail(row.id)
      },
    },
  }),
} satisfies CellEnhanceRenderTo<Row>
```

事件由调用方提供。需要避免触发表格行点击时，在事件中调用 `stopPropagation()`。表格保留 `cellRender` 的最高优先级，配置本插件的列无需再设置它。

## Badge 参数

以下配置位于 `cellRenderTo.props.props`：

| 参数 | 作用 |
| --- | --- |
| `variant` / `size` / `radius` | ReUI Badge 的颜色变体、尺寸、圆角，沿用本地组件完整类型 |
| `dictName` | 字典分类 `code` 字符串，由统一字典仓库获取选项 |
| `options` | 直接传选项数组，每项支持 `value`、`label`、插槽和 Badge 原生属性；优先于 `dictName` |
| `optionProps` | 字典模式下的 `(字典项) => 展示属性`，支持标签、插槽及 Badge 原生属性覆盖 |
| `formatValue` | 未设置映射标签时格式化显示内容 |
| `emptyText` | 空数据占位，默认 `-`，支持 React 节点 |
| `leading` / `trailing` | 前后插槽，可组合图标、头像、图片或关闭按钮 |
| `dot` | 显示跟随文字颜色的圆点，默认 `false` |
| `containerClassName` | 多个 Badge 的外层布局样式 |
| `className` / `style` | 每个 Badge 的样式 |
| `render`、事件及其他原生属性 | 透传给 ReUI Badge，支持组合为链接或按钮 |

映射优先匹配同类型值，再匹配字符串等价值，因此数字 `1` 可匹配接口返回的 `"1"`。未知值显示原值。`0`、`false` 是有效值；`null`、`undefined`、空白字符串、非有限数字及对象不显示为标签。数组过滤无效项，全部为空时显示占位。

数组模式下，单项配置覆盖公共配置；字典模式下，优先级为公共配置 → 字典颜色 → `optionProps`。`className` 和 `style` 合并。单项 `dot: false` 或插槽 `null` 可关闭公共圆点或插槽。显式设置 `label: null` 或格式化函数返回 `null` 会保留空标签内容。`optionProps` 只负责字典项展示，不应修改字典项。

组合关闭按钮时，数据更新由调用方控制；Badge 本身作为按钮或链接时，避免内部再嵌套交互元素。

## 直接使用组件

表格之外也可以直接使用组件：

```tsx
import { Check } from 'lucide-react'
import { BadgeCell } from '$/west/cell-enhance'

<>
  <BadgeCell value="已完成" variant="success-light" radius="full" leading={<Check />} />
  <BadgeCell value={1} dictName="system-status" radius="full" />
  <BadgeCell value={1} options={[{ value: 1, label: '启用', variant: 'success-light' }]} />
</>
```

## 代码职责

```text
cell-enhance/
  index.ts                       # 插件入口与公共导出
  config/
    index.ts                     # 插件元信息与渲染器名称
    badge.ts                     # 字典颜色与 ReUI 变体映射
  components/
    avatar-info-cell.tsx         # 头像、姓名、徽章与副标题
    badge-cell.tsx               # 单元格布局与空态
    badge-item.tsx               # 单个 ReUI Badge 展示
  hooks/
    use-dictionary-options.ts    # 按分类 code 响应式读取字典
  types/
    index.ts                     # 类型出口
    avatar-info.ts               # 头像信息参数与字段映射
    badge.ts                     # Badge 参数及展示数据
    renderer.ts                  # cellRenderTo 契约
  utils/
    avatar-info-utils.ts         # 当前行字段取值与头像缩写
    badge-utils.ts               # 取值、过滤、映射、插槽和属性合并
    option-utils.ts              # 数组选项与字典项的值匹配
    render-cell-enhance.ts       # 渲染类型选择与表格值传递
    register-renderers.ts        # 注册共享表格渲染器
  examples/
    avatar-info-columns.tsx      # 头像信息的字段映射与动态配置示例
    badge-columns.tsx            # 徽章的类型完整示例
```

渲染器参数不合法时回退显示表格原值；前端权限与业务事件由使用方按现有流程处理。
