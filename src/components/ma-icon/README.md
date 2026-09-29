# MaIcon

统一显示 Iconify 图标和项目自定义 SVG，支持加载、失败与空名称占位。

```tsx
import { MaIcon } from '@/components/ma-icon'

<MaIcon name="lucide:search" className="size-5" label="搜索" />
```

`MaIconProps` 包含 `name: string`、可选 `className` 和 `label`。设置 `label` 时提供图像语义；未设置时作为装饰图标隐藏于辅助技术。图标加载由 `useIcon` 管理，异步结束或卸载时清理监听与超时，失败显示占位。

需要自定义展示时可从同一公共入口导入 `useIcon`；它返回 `empty`、`loading`、`error` 或带 `data` / `src` 的 `ready` 状态。图标名称规范化和自定义 SVG 地址沿用 `src/utils/icons.ts`，组件不依赖应用状态。

## 工程结构

根目录 `index.ts` 仅提供公共导出，类型集中到 `types/`。结构约束见 [Ma 组件工程规范](../../../docs/MA_COMPONENTS.md)。

| 目录 | 职责 | 文件 |
| --- | --- | --- |
| `components/` | 展示组件 | ma-icon.tsx |
| `hooks/` | 状态与生命周期 | use-icon.ts |
| `types/` | 公共及内部类型 | index.ts |

使用 `pnpm run check:ma` 验证结构、类型、Lint 和行为；迁移验证同时覆盖应用消费者与依赖边界。
