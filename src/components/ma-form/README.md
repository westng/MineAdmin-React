# MaForm

`MaForm` 是 React 端的配置驱动表单组件。调用方通过 `items` 描述字段，通过 `options` 配置布局和校验规则；组件负责模型更新、字段显隐、内置控件渲染、校验和实例方法。

本文按当前 `web/src/components/ma-form` 源码整理。它使用项目内的 ReUI/Base UI 控件，不依赖 Vue、Element Plus 或独立的 `@mineadmin/form` 运行时包。

## 快速开始

```tsx
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
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
| `renderProps` | 传给控件的属性 | `Record<string, unknown>` |
| `children` | 自定义渲染项的子配置 | `MaFormItem<T>[]` |

`show` 和 `hide` 的区别是：`show` 为假时字段不挂载，`hide` 为真时字段保留在表单树中但使用隐藏样式。`MaForm` 当前只使用 `cols.span` 和 `cols.offset`，响应式 `xs`、`sm`、`md`、`lg`、`xl` 字段只是类型保留。`children` 当前只对带函数式 `render` 的自定义子项执行渲染。

## 内置控件

`render` 或 `component` 使用以下字符串时会渲染对应的项目控件：

| 名称 | 控件 | 值类型 |
| --- | --- | --- |
| `Input` | 文本输入框 | `string` |
| `Password` | 密码输入框 | `string` |
| `InputNumber` | 数字输入框 | `number | undefined` |
| `Textarea` | 多行文本框 | `string` |
| `Select` | 选择器 | `string` |
| `Checkbox` | 复选框 | `boolean` |
| `Switch` | 开关语义的复选控件 | `boolean` |
| `DatePicker` | 日期输入框 | `string` |
| `TimePicker` | 时间输入框 | `string` |
| `Radio` | 单选组 | `string` |

`Select` 和 `Radio` 从 `renderProps.options` 或 `renderProps.items` 读取选项。选项可以是字符串、数字，或包含 `label`、`name`、`title`、`value`、`id` 的对象。

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
