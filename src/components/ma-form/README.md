# MaForm

`MaForm` 是配置驱动的通用表单组件。业务字段、文案和页面布局由调用方提供；组件只负责字段渲染、模型更新和规则校验。

公开入口：

```ts
import { MaForm, type MaFormItem, type MaFormExpose } from '@/components/ma-form'
```

核心契约位于 `types.ts`：`MaFormProps<T>`、`MaFormItem<T>`、`MaFormOptions`、`MaFormExpose<T>`。
