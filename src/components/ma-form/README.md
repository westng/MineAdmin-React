# MaForm

`MaForm` 是配置驱动的通用表单组件。业务字段、文案和页面布局由调用方提供；组件只负责字段渲染、模型更新和规则校验。

公开入口：

```ts
import { MaForm, type MaFormItem, type MaFormExpose } from '@/components/ma-form'
```

核心契约位于 `types/index.ts`：`MaFormProps<T>`、`MaFormItem<T>`、`MaFormOptions`、`MaFormExpose<T>`。

目录职责：

- `index.ts`：唯一公开入口，只导出组件和公开类型。
- `types/index.ts`：公开接口与组件契约，不放渲染逻辑。
- `components/ma-form.tsx`：字段状态、校验编排与表单视图渲染。
- `utils/form-utils.ts`：字段路径、标签和表单值辅助函数。

提交时会先执行当前可见字段的规则校验，校验失败会聚焦首个错误控件；`labelPosition`、`labelWidth` 和 `labelSuffix` 分别控制标签方向、宽度和后缀。
