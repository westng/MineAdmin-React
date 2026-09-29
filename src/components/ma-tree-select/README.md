# MaTreeSelect

基于 ReUI Cascader tree 模式的受控树选择器，支持搜索、单选、多选、排除节点和根选项。

```tsx
import { MaTreeSelect } from '@/components/ma-tree-select'

<MaTreeSelect items={nodes} value={selectedId} onValueChange={setSelectedId} />
<MaTreeSelect multiple items={nodes} value={selectedIds} onValueChange={setSelectedIds} />
```

公共类型为 `MaTreeSelectProps<T>`、`MaTreeSelectSingleProps<T>` 和 `MaTreeSelectMultipleProps<T>`，节点沿用 ReUI `CascaderNode<T>`。

- 单选接受字符串、数字或 `null`，回调返回字符串；多选接受字符串或数字数组，回调返回字符串数组。
- `rootOption` 添加根选项；`excludeValues` 过滤指定节点及其子树，不修改调用方数据。
- `multiple` 模式可设置 `cascade`、`max`；两种模式均支持 `selectable`、`disabled`、`readOnly`、`required`、`invalid`。
- `placeholder`、`searchPlaceholder`、`emptyText`、`ariaLabel`、`maxHeight`、`className` 与 `contentClassName` 调整展示。

节点过滤放在 `utils/`，触发器和弹层组合放在独立子组件；选中值由调用方管理。

## 工程结构

根目录 `index.ts` 仅提供公共导出，类型集中到 `types/`。结构约束见 [Ma 组件工程规范](../../../docs/MA_COMPONENTS.md)。

| 目录 | 职责 | 文件 |
| --- | --- | --- |
| `components/` | 展示组件 | ma-tree-select.tsx, tree-select-content.tsx |
| `types/` | 公共及内部类型 | index.ts |
| `utils/` | 转换与状态工厂 | tree-options.ts |

使用 `pnpm run check:ma` 验证结构、类型、Lint 和行为；迁移验证同时覆盖应用消费者与依赖边界。
