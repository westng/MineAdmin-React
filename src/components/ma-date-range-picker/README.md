# MaDateRangePicker

基于 ReUI Calendar 和 Popover 的受控日期范围选择器，支持快捷范围、清空、只读和表单属性透传。

```tsx
import { MaDateRangePicker } from '@/components/ma-date-range-picker'

<MaDateRangePicker value={range} onChange={setRange} />
```

公共入口提供 `MaDateRangePicker`、表单适配组件 `MaDateRangePickerField`、`defaultDateRangeShortcuts`，以及 `MaDateRangePickerProps`、`MaDateRangeShortcut`。

- `value` / `onChange` 沿用表单兼容的 `unknown` 契约，范围以数组表示；清空返回 `undefined`。
- `valueFormat` 默认 `yyyy-MM-dd HH:mm:ss`，设为 `date` 时日历选择返回 Date；`displayFormat` 默认 `yyyy-MM-dd HH:mm`。日历选择将起止时间归一到当天开始与结束。
- `shortcuts` 接受 `{ label, getValue }[]`，默认提供常用日期范围。快捷项返回值原样交给 `onChange`；使用 `valueFormat="date"` 时应提供返回 Date 数组的快捷项。
- 支持 `disabled`、`readOnly`、`placeholder`、`id`、`className` 与 ARIA 属性；`calendarProps`、`popupProps`、`triggerProps` 扩展底层控件。

日期转换集中在 `utils/`，默认快捷项在 `data/`；范围值与业务时区策略由调用方负责，组件保持现有本地日期行为。

## 工程结构

根目录 `index.ts` 仅提供公共导出，类型集中到 `types/`。结构约束见 [Ma 组件工程规范](../../../docs/MA_COMPONENTS.md)。

| 目录 | 职责 | 文件 |
| --- | --- | --- |
| `components/` | 展示组件 | ma-date-range-picker.tsx |
| `data/` | 默认配置与目录数据 | shortcuts.ts |
| `types/` | 公共及内部类型 | index.ts |
| `utils/` | 转换与状态工厂 | date-range-utils.ts |

使用 `pnpm run check:ma` 验证结构、类型、Lint 和行为；迁移验证同时覆盖应用消费者与依赖边界。
