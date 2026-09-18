# MaForm

`MaForm` 是 React 端的配置驱动表单组件。调用方通过 `items` 描述字段，通过 `options` 配置布局和校验规则；组件负责模型更新、字段显隐、内置控件渲染、校验和实例方法。

本文按当前 `web/src/components/ma-form` 源码整理。它使用项目内的 ReUI/Base UI 控件，不依赖 Vue、Element Plus 或独立的 `@mineadmin/form` 运行时包。

## 快速开始

```tsx
import { useRef, useState } from 'react'
import { Button } from '@/components/reui/primitives/button'
import { MaForm, type MaFormExpose, type MaFormItem } from '@/components/ma-form'

interface Profile {
  username: string
  email: string
  enabled: boolean
}

export function ProfileForm() {
  const formRef = useRef<MaFormExpose<Profile>>(null)
  const [model, setModel] = useState<Profile>({ username: '', email: '', enabled: true })
  const items: MaFormItem<Profile>[] = [
    { label: '用户名', prop: 'username', render: 'Input', renderProps: { placeholder: '请输入用户名' } },
    { label: '邮箱', prop: 'email', render: 'Input', renderProps: { placeholder: 'name@example.com' } },
    { label: '启用状态', prop: 'enabled', render: 'Switch' },
  ]

  return (
    <MaForm
      ref={formRef}
      modelValue={model}
      items={items}
      onModelValueChange={setModel}
      options={{
        layout: 'grid',
        grid: { columns: 2, gap: '1rem' },
        rules: {
          username: { required: true, message: '请输入用户名' },
          email: { required: true, type: 'email', message: '请输入有效邮箱' },
        },
      }}
      footer={<div className="flex justify-end gap-2"><Button type="submit">保存</Button></div>}
      onSubmit={async values => { await saveProfile(values) }}
    />
  )
}
```

`modelValue` 是受控模型；不传 `modelValue` 时，可以使用 `defaultValue` 创建非受控表单。`footer` 和 `children` 都会渲染在字段区域之后，适合放提交、取消或辅助操作。

## 公共入口

```ts
import {
  MaForm,
  type MaFormExpose,
  type MaFormItem,
  type MaFormOptions,
  type MaFormRule,
} from '@/components/ma-form'
```

## Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `modelValue` | 受控表单模型 | `T` | - |
| `defaultValue` | 非受控模式的初始模型 | `Partial<T>` | `{}` |
| `items` | 字段配置数组 | `MaFormItem<T>[]` | `[]` |
| `options` | 表单布局、校验和状态配置 | `MaFormOptions` | `{}` |
| `className` | 表单根节点 class | `string` | - |
| `children` | 字段之后的自定义内容 | `ReactNode` | - |
| `footer` | 字段之后的页脚内容 | `ReactNode` | - |
| `onModelValueChange` | 模型发生变化时触发 | `(value: T) => void` | - |
| `onChange` | 模型发生变化时触发，和 `onModelValueChange` 同时调用 | `(value: T) => void` | - |
| `onSubmit` | 原生提交且校验通过后触发 | `(value: T) => void | Promise<void>` | - |

## MaFormOptions

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `loading` | 显示表单加载遮罩并禁用控件 | `boolean` | `false` |
| `containerClass` | 表单容器 class | `string` | - |
| `layout` | 布局模式 | `'flex' | 'grid'` | `'flex'` |
| `grid` | 网格列数、间距和交叉轴对齐 | `{ columns?: number; gap?: number | string; className?: string; alignment?: CSSProperties['alignItems'] }` | - |
| `flex` | 单列布局的间距 | `{ gap?: number | string; justify?: CSSProperties['justifyContent']; align?: CSSProperties['alignItems'] }` | - |
| `footerSlot` | 未传 `footer` 时使用的页脚 | `ReactNode | (() => ReactNode)` | - |
| `inline` | 使用紧凑的底部对齐方式；同时默认网格列数为 4 | `boolean` | `false` |
| `labelPosition` | 标签方向 | `'left' | 'right' | 'top'` | `'top'` |
| `labelWidth` | 水平标签宽度 | `string | number` | - |
| `labelSuffix` | 追加到标签后的文本 | `string` | - |
| `disabled` | 禁用全部内置控件 | `boolean` | `false` |
| `rules` | 以字段路径为键的校验规则 | `Record<string, MaFormRule | MaFormRule[]>` | - |
| `className` | 表单内部配置的 class | `string` | - |

当 `layout` 为 `grid`，或 `inline` 让列数大于 1 时，表单使用 CSS Grid；否则使用 Flex。`grid.columns` 未配置时，普通表单为 1 列，`inline` 表单为 4 列。当前渲染器实际读取 `grid.columns`、`grid.gap`、`grid.alignment` 和 `flex.gap`；`grid.className`、`flex.justify`、`flex.align` 仍在类型中但不会改变布局。

## MaFormItem

| 参数 | 说明 | 类型 |
| --- | --- | --- |
| `label` | 标签文本或节点，也可以是返回标签的函数 | `string | ReactNode | (() => string)` |
| `showLabel` | 是否显示标签 | `boolean` |
| `prop` | 模型字段路径，支持点路径或根据模型计算路径 | `string | ((model: T) => string)` |
| `hide` | 隐藏字段但保留节点和模型值；隐藏字段不会参与校验 | `boolean | ((item, model) => boolean)` |
| `show` | 是否渲染字段；为 `false` 时不输出节点 | `boolean | ((item, model) => boolean)` |
| `cols` | 网格占用列数和偏移；`span`、`offset` 使用 24 栅格换算 | `{ span?: number; offset?: number; xs?: number; sm?: number; md?: number; lg?: number; xl?: number }` |
| `itemProps` | 字段容器属性、规则、帮助和附加说明 | `MaFormItemProps` |
| `itemSlots` | 自定义标签、帮助、附加说明和错误内容 | `MaFormItem<T>['itemSlots']` |
| `render` | 内置控件名、自定义渲染函数或组件 | `MaFormRender<T> | MaFormComponentName | ComponentType` |
| `component` | 内置控件名或自定义组件；优先于 `render` | `MaFormComponentName | ComponentType` |
| `renderProps` | 随内置控件类型检查参数；自定义渲染器保留开放配置 | `MaFormControlPropsMap[组件名]` |
| `children` | 自定义渲染项的子配置 | `MaFormItem<T>[]` |

`show` 和 `hide` 的区别是：`show` 为假时字段不挂载，`hide` 为真时字段保留在表单树中但使用隐藏样式。`MaForm` 当前只使用 `cols.span` 和 `cols.offset`，响应式 `xs`、`sm`、`md`、`lg`、`xl` 字段只是类型保留。`children` 当前只对带函数式 `render` 的自定义子项执行渲染。

## 内置控件

`render` 或 `component` 使用以下字符串时会渲染对应的项目控件：

| 名称 | 控件 | 值类型 |
| --- | --- | --- |
| `Input` | 文本输入框 | `string` |
| `Password` | 密码输入框 | `string` |
| `InputNumber` | ReUI NumberField | `number | undefined` |
| `Textarea` | 多行文本框 | `string` |
| `Select` | Base UI Select，支持多选 | 选项原值，多选为数组 |
| `Checkbox` | 复选框 | `boolean` |
| `Switch` | Base UI Switch | `boolean` |
| `DatePicker` | Calendar + Popover | 默认日期字符串，支持范围、数组或 Date |
| `TimePicker` | 分段 Select | `HH:mm` 或 `HH:mm:ss` |
| `Radio` | Base UI RadioGroup / Radio | 选项原值 |

`Select` 和 `Radio` 从 `renderProps.options` 或 `renderProps.items` 读取选项。选项可以是字符串、数字、布尔值或包含 `label/name/title/value/id` 的对象；保留原值类型，不再强制转成字符串。选中后展示 label，提交仍使用 value。旧业务如果自行依赖字符串数值，应将选项 value 明确配置为字符串。

## 配置、事件和高级控件

新的 `items/options` props 会立即生效。`setItems/setOptions` 的运行时修改保留到对应 props 换成新引用；`defaultValue` 只初始化模型，持续控制模型请使用 `modelValue`。表单级 `disabled/loading` 对内置控件优先，控件不能用 `disabled: false` 覆盖。

```tsx
const items: MaFormItem[] = [
  { prop: 'tags', render: 'Select', renderProps: {
    multiple: true,
    options: [{ label: '研发', value: 1 }, { label: '运营', value: 2 }],
    onValueChange: (value, details) => { if (!canChange(value)) details.cancel() },
    triggerProps: { className: 'w-full' },
    popupProps: { sideOffset: 8, portalProps: { container: document.body } },
  } },
  { prop: 'count', render: 'InputNumber', renderProps: { min: 0, max: 100, step: 5 } },
  { prop: 'date', render: 'DatePicker', renderProps: { valueFormat: 'yyyy-MM-dd', min: '2026-01-01' } },
  { prop: 'time', render: 'TimePicker', renderProps: { minuteStep: 15, showSeconds: false } },
]
```

| 控件 | 扩展入口 |
| --- | --- |
| Select | Root 参数直接写入 `renderProps`；各部位使用 `triggerProps/valueProps/popupProps/itemProps`；Popup 内支持 `portalProps/positionerProps/listProps` |
| Checkbox / Switch | 保留 `onCheckedChange(checked, details)`、只读、必填和状态样式等原语属性 |
| Radio | Root 参数与 `onValueChange`，选项部位使用 `itemProps` |
| InputNumber | Root 的 `min/max/step/format/locale/onValueChange/onValueCommitted` 等；部位通过 `inputProps/groupProps/incrementProps/decrementProps`；`controls: false` 隐藏步进按钮 |
| DatePicker | `mode: single/multiple/range`，`valueFormat` 使用 date-fns 格式或 `'date'`；`calendarProps/popoverProps/popupProps/triggerProps`；`min/max` 限制可选日期 |
| TimePicker | `minuteStep/secondStep/showSeconds` 和 `hourProps/minuteProps/secondProps`，每段保留 Select Root、Trigger、Popup 配置 |

内置控件的值由 MaForm 模型管理。值变化回调先收到完整 Base UI 事件详情，`details.cancel()` 可阻止模型更新；普通输入的 `onChange` 与模型更新会合并，`preventDefault()` 可取消更新。日期和时间属于组合控件，使用上表的适配契约；需要完全自定义的布局或其他模式时使用 `render/component`。

`MaFormItem` 按 `render/component` 区分内置参数类型，例如 Select 的 `multiple` 必须是布尔值、InputNumber 的 `min` 必须是数字。自定义 renderer 的 `renderProps` 仍是开放对象。相关类型从 `@/components/ma-form` 导出。

文本类控件支持 `renderProps.prefix` 和 `renderProps.suffix`，组件会将控件放入 `InputGroup`。这两个属性不会继续透传给底层输入控件。

## 校验

规则可以放在 `options.rules[prop]`，也可以放在单项的 `itemProps.rules`；单项规则优先。

```tsx
const items: MaFormItem<Account>[] = [
  {
    label: '账号',
    prop: 'account',
    render: 'Input',
    itemProps: {
      rules: [
        { required: true, message: '请输入账号' },
        { min: 3, max: 32, message: '账号长度应为 3-32 个字符' },
      ],
    },
  },
]
```

`MaFormRule` 支持 `required`、`type`、`min`、`max`、`pattern` 和异步 `validator`。`type` 可选 `string`、`number`、`email`。提交时会校验可见字段；失败后会聚焦第一个错误控件，并返回 `{ valid, errors }`。

```ts
const result = await formRef.current?.validate()
if (!result?.valid) return
const values = formRef.current?.getValues()
```

## 自定义渲染

函数式 `render` 会收到当前字段上下文：

```tsx
{
  label: '昵称',
  prop: 'profile.nickname',
  render: ({ value, setValue }) => (
    <Input
      value={String(value ?? '')}
      placeholder="请输入昵称"
      onChange={event => setValue(event.target.value)}
    />
  ),
}
```

`MaFormRenderContext<T>` 包含 `item`、`formData`、`value` 和 `setValue`。如果使用 `component` 传入自定义组件，组件会收到 `value`、`disabled`、`onChange` 以及 `renderProps`。

## 实例方法

```tsx
const formRef = useRef<MaFormExpose<Account>>(null)

formRef.current?.setValues({ account: 'admin' })
formRef.current?.clearValidate(['account'])
```

| 方法 | 说明 | 返回值 |
| --- | --- | --- |
| `validate()` | 校验全部可见字段 | `Promise<MaFormValidationResult>` |
| `validateField(prop)` | 校验指定字段 | `Promise<boolean>` |
| `resetFields(props?)` | 恢复字段初始值并清除错误 | `T` |
| `clearValidate(props?)` | 清除全部或指定字段错误 | `void` |
| `setValues(values)` | 合并设置模型；传 `null` 清空模型 | `void` |
| `getValues()` | 获取当前模型 | `T` |
| `setLoadingState(loading)` | 设置运行时加载状态 | `void` |
| `setOptions(options)` | 合并更新配置 | `void` |
| `getOptions()` | 获取当前配置 | `MaFormOptions` |
| `setItems(items)` | 替换字段配置 | `void` |
| `getItems()` | 获取字段配置 | `MaFormItem<T>[]` |
| `appendItem(item)` | 追加字段 | `void` |
| `removeItem(prop)` | 按字段路径删除字段 | `void` |
| `getItemByProp(prop)` | 按字段路径查找字段 | `MaFormItem<T> | null` |
| `getElFormRef()` | 获取原生 `HTMLFormElement` | `HTMLFormElement | null` |

## 目录职责

- `index.ts`：唯一公开入口。
- `types/index.ts`：公开类型和组件契约。
- `components/ma-form.tsx`：模型、字段、校验和视图编排。
- `utils/form-utils.ts`：字段路径和标签辅助函数。

## 相关链接

- [MineAdmin MaForm 官方文档](https://doc.mineadmin.com/libs/ma-form/latest/)
