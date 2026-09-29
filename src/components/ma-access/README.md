# MaAccess

根据调用方传入的权限结果选择渲染内容；组件不解析权限、不读取 Runtime。

```tsx
import { MaAccess } from '@/components/ma-access'

<MaAccess allowed={canEdit} fallback={<span>只读</span>}>
  <button type="button" onClick={edit}>编辑</button>
</MaAccess>
```

`MaAccessProps` 包含 `allowed: boolean`、必传 `children: ReactNode` 和可选 `fallback: ReactNode`（默认 `null`）。仅 `allowed === true` 时展示子内容。权限判断由应用既有能力提供；显示控制不替代后端授权。

## 工程结构

根目录 `index.ts` 仅提供公共导出，类型集中到 `types/`。结构约束见 [Ma 组件工程规范](../../../docs/MA_COMPONENTS.md)。

| 目录 | 职责 | 文件 |
| --- | --- | --- |
| `components/` | 展示组件 | ma-access.tsx |
| `types/` | 公共及内部类型 | index.ts |

使用 `pnpm run check:ma` 验证结构、类型、Lint 和行为；迁移验证同时覆盖应用消费者与依赖边界。
