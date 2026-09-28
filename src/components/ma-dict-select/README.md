# MaDictSelect

基于项目 Shadcn/ReUI Select 的字典下拉组件。组件通过 `dictName` 从当前 `MaDictionaryContext` 读取选项，保留字典原始值类型，并默认支持清除。`AppProviders` 注入当前 Runtime 的字典和翻译订阅；多个应用实例互不共享字典状态。

独立使用时，可通过组件导出的 `MaDictionaryContext.Provider` 传入 `MaDictionarySource`：字典快照与订阅、语言版本快照与订阅、翻译函数。组件不依赖应用 Hook 或服务；没有注入时字典为空，译文回退到原始 label。快照在数据不变时须保持引用稳定。

```tsx
import { MaDictSelect } from '@/components/ma-dict-select'

<MaDictSelect
  dictName="system-status"
  value={status}
  placeholder="请选择状态"
  onChange={setStatus}
/>
```

字典项存在 `i18n` 时，组件会使用当前语言翻译；没有注册字典或字典为空时，选择项为空。`clearable` 默认为 `true`，清除单选值会回写 `null`，设置为 `false` 可关闭清除按钮。

也可以作为 `MaForm` 的自定义组件使用：

```tsx
{
  prop: 'status',
  label: '状态',
  component: MaDictSelect,
  renderProps: { dictName: 'system-status' },
}
```
