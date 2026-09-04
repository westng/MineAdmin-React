# MaSearch

`MaSearch` 基于 `MaForm` 提供搜索字段、折叠、查询和重置能力。搜索请求由调用方处理，组件不绑定业务 API。

搜索项标签默认放在控件内部：文本类控件显示为持久前缀，选择类控件显示为占位文本；需要恢复外置标签时，将 `options.labelPlacement` 设置为 `outside`。

公开入口：

```ts
import { MaSearch, type MaSearchItem, type MaSearchExpose } from '@/components/ma-search'
```

核心契约位于 `types/index.ts`：`MaSearchProps<T>`、`MaSearchItem<T>`、`MaSearchOptions`、`MaSearchExpose<T>`。

`foldRows` 表示折叠后保留的网格行数，会随响应式列数和字段 `span` 重新计算；折叠按钮提供 `aria-expanded` 状态。

目录职责：

- `index.ts`：唯一公开入口，只导出组件和公开类型。
- `types/index.ts`：公开接口与组件契约，不放渲染逻辑。
- `components/ma-search.tsx`：组件状态编排与视图渲染。
- `utils/search-utils.ts`：无副作用的搜索文案等辅助函数。
