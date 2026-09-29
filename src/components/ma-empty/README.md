# MaEmpty

通用无状态空状态组件，组合 ReUI Empty 原语，不依赖应用 Runtime、Provider 或业务请求。

默认 `type="search"` 内置官方 **Search empty state with stacked file cards illustration**（`c-empty-16`）：三层文件卡片及底部淡出，使用主题变量适配明暗主题，无需图片资源或网络请求。

```tsx
import { MaEmpty } from '@/components/ma-empty'
import { Button } from '@/components/reui/primitives/button'

// 默认堆叠文件卡片插画及“暂无数据”标题。
<MaEmpty />

// 搜索无结果，操作行为由调用方提供。
<MaEmpty
  title="未找到相关结果"
  description="试试其他关键词，或清除筛选条件。"
  actions={<Button variant="outline" onClick={clearFilters}>清除筛选</Button>}
/>

// 紧凑容器中的简洁图标。
<MaEmpty type="simple" size="sm" title="暂无记录" />

// 自定义装饰图片；设为 null 可隐藏图片。
<MaEmpty image={<img src="/images/empty.svg" alt="" className="h-24" />} title="还没有文件">
  <a href="/help">查看使用说明</a>
</MaEmpty>
```

## 公共契约

| 属性 | 类型 | 默认值与说明 |
| --- | --- | --- |
| `type` | `'search' \| 'simple'` | 默认 `search`；`simple` 使用 Inbox 图标 |
| `size` | `'default' \| 'sm'` | 默认 `default`；`sm` 缩小间距和默认搜索插画 |
| `title` | `ReactNode` | 默认“暂无数据”；支持自定义节点或传 `null` 隐藏 |
| `description` | `ReactNode` | 可选说明文案 |
| `image` | `ReactNode` | 未传时根据 `type` 展示内置插画；`null` / `false` 隐藏 |
| `actions` | `ReactNode` | 操作区，支持多个按钮并自动换行 |
| `children` | `ReactNode` | 操作区之后的补充内容 |
| `className` | `string` | 根容器样式，可覆盖间距、边框等 |
| `classNames` | `Partial<Record<MaEmptySlot, string>>` | `header`、`image`、`title`、`description`、`content`、`actions` 插槽样式 |

支持原生 `div` 属性、事件和 `ref`，原生字符串 `title` 属性由上述标题契约替代。组件、`MaEmptyProps`、`MaEmptyType`、`MaEmptySize` 和 `MaEmptySlot` 统一从 `@/components/ma-empty` 导出。

## 行为与可访问性

- 默认根节点为 `role="status"`；标题和说明通过独立 ID 自动关联 `aria-labelledby` / `aria-describedby`。调用方可覆盖 `role` 和 ARIA 属性；显式 `aria-label` 会替代自动生成的标题引用。
- 图片槽为装饰内容，设置了 `aria-hidden="true"`。不要在图片槽中放按钮、链接或唯一的状态说明；交互放在 `actions` / `children`，语义文案放在标题或说明中。
- 未提供的说明、操作和补充内容不生成对应容器；`null`、布尔值或空字符串隐藏相应插槽，数字 `0` 保留显示。
- 组件只展示空状态，加载、错误、权限和是否为空由调用方判断；文案翻译由调用方传入。按钮权限与事件处理沿用业务页面的既有流程。
- `size="sm"` 仅缩小内置搜索插画，自定义图片的尺寸由调用方控制。

## 结构、来源与验证

```text
ma-empty/
├── index.ts                                   # 组件与公共类型出口
├── components/ma-empty.tsx                    # 展示组合与可访问性
├── illustrations/search-cards-illustration.tsx # 官方插画适配
├── types/index.ts                             # 公共契约
└── README.md
```

插画来源：[ReUI Empty 示例](https://reui.io/components/empty)，[固定版本 c-empty-16 源码](https://github.com/keenthemes/reui/blob/6e433ddaba3a4be38182c8c8883b6cc335183c42/registry-reui/bases/base/components/empty/c-empty-16.tsx)。保留官方卡片结构与主题配色，并补充容器宽度约束；许可见根目录 [THIRD_PARTY_NOTICES.md](../../../THIRD_PARTY_NOTICES.md)。

通过 `pnpm run check:ma` 验证类型、Lint 与行为。测试入口为 `tests/ma-components.test.mjs`、`tests/ma-components.types.tsx`；`ma-*` 目录由框架公共导出规则与 Tailwind 源码扫描覆盖。
