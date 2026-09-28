# Toast

通知由 Sonner 渲染，项目通过 `ToastProvider` 为每个应用作用域分配独立的通知 ID 和关闭范围。当前接口以 [toast-api.ts](toast-api.ts)、[toast.tsx](toast.tsx) 和 [use-toast.ts](use-toast.ts) 为准。

## 挂载

`src/provider/app-provider.tsx` 已挂载 `ToastProvider` 并传入当前主题。应用页面无需重复挂载；独立组件可自行提供 Provider：

```tsx
import { ToastProvider } from '@/components/reui/toast'

;<ToastProvider theme="system" position="top-right" duration={3500}>
  <AppContent />
</ToastProvider>
```

默认持续 3500ms、最多展示 4 条、偏移 16px、显示关闭按钮。Provider 接收除 `id` 以外的 Sonner `ToasterProps`；ID 由 Provider 管理，卸载时只关闭自己创建的通知。独立的 `Toaster` 导出保留全部 `ToasterProps`，但不会提供 `useToast` 上下文。

## 调用

React 组件在 Provider 内通过 `useToast()` 取得当前作用域的 API：

```tsx
import { useToast } from '@/components/reui/use-toast'

function SaveButton() {
  const { toast } = useToast()

  async function save() {
    toast.loading('正在保存', { id: 'save' })
    try {
      await saveRecord()
      toast.success('保存成功', { id: 'save', description: '记录已更新' })
    } catch {
      toast.error('保存失败', { id: 'save' })
    }
  }

  return (
    <button type="button" onClick={() => void save()}>
      保存
    </button>
  )
}
```

- `toast(message, options?)` 显示普通通知。
- `toast.success/error/info/warning/loading(message, options?)` 显示对应状态。
- `toast.dismiss(id?)` 关闭本作用域的一条或全部通知。支持传回方法返回的 ID，也支持调用时指定的原始 ID。
- 更新通知时重复使用同一个原始 `options.id`，如示例中的 `'save'`；返回值是加过作用域前缀的 ID，不要将它再次作为更新选项传入。

消息支持 React 节点，选项支持 `description`、`duration`、`action`、`cancel` 等 Sonner 配置，`toasterId` 由作用域管理。普通函数需要通知能力时由组件传入 `toast` 或提示回调；应用页面也可以使用 `@/hooks/ui/use-message`。

当前模块不导出全局 `toast` 或 `useSonner`。作用域 API 不提供 `message/promise/custom/getToasts/getHistory`，也不接受第二参数为状态字符串的旧写法。异步提示按上述 loading、success/error 流程组合；完整类型见 `ToastApi`，不要直接套用上游 Sonner 的全部方法。
