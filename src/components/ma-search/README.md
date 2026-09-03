# MaSearch

`MaSearch` 基于 `MaForm` 提供搜索字段、折叠、查询和重置能力。搜索请求由调用方处理，组件不绑定业务 API。

公开入口：

```ts
import { MaSearch, type MaSearchItem, type MaSearchExpose } from '@/components/ma-search'
```

核心契约位于 `types.ts`：`MaSearchProps<T>`、`MaSearchItem<T>`、`MaSearchOptions`、`MaSearchExpose<T>`。
