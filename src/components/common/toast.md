# Toast

基于官方 `sonner`，渲染层使用 shadcn `base-nova` registry 生成的 `components/ui/sonner.tsx`。项目封装保留 Sonner 的方法、参数类型和返回值，兼容原有调用。

## 挂载与配置

`App.tsx` 已挂载 `ToastProvider`，并通过 `theme` 传入项目主题。Provider 和独立的 `Toaster` 均接受官方全部 `ToasterProps`，调用方可覆盖默认配置。

```tsx
import { ToastProvider } from '@/components/common/toast'

<ToastProvider
  position="top-right"
  theme="system"
  richColors
  closeButton
  duration={5000}
  visibleToasts={5}
  toastOptions={{ classNames: { description: 'text-xs' } }}
>
  <AppContent />
</ToastProvider>
```

默认位置为右上角、持续 3500ms、最多展示 4 条、偏移 16px、显示关闭按钮。队列、计时、交互和可访问性由 Sonner 管理。独立 `Toaster` 适用于额外挂载点，可通过 `id` 与单条通知的 `toasterId` 配合使用；同一挂载点无需重复渲染 Provider 和 Toaster。

## 调用

React 组件中保留 `const { toast } = useToast()`，也可以直接导入 `toast` 在事件、工具函数等位置调用。直接调用需要应用已挂载 Toaster。

```tsx
import { toast, useToast, useSonner } from '@/components/common/use-toast'

toast('普通通知')
toast.message('消息', { description: '补充说明' })
toast.success('保存成功')
toast.info('有新的消息')
toast.warning('请检查输入')
toast.error('保存失败')

// JSX 和渲染函数均按官方 API 传入。
toast(<strong>保存成功</strong>, { description: () => <span>可以继续编辑</span> })

toast('记录已保存', {
  action: { label: '查看', onClick: () => console.log('查看') },
  cancel: { label: '稍后', onClick: () => console.log('稍后') },
  onDismiss: item => console.log('关闭', item.id),
  onAutoClose: item => console.log('超时关闭', item.id),
})

// 返回官方通知 ID，可更新或关闭同一条通知。
const id = toast.loading('正在保存')
toast.success('保存成功', { id })
toast.dismiss(id)
toast.dismiss() // 关闭所有通知

toast.promise(Promise.resolve({ name: '示例记录' }), {
  loading: '正在保存',
  success: result => `${result.name}已保存`,
  error: error => error instanceof Error ? error.message : '保存失败',
})

// 无样式模式，业务组件和样式放在所属模块中。
toast.custom(id => (
  <div className="rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
    自定义通知
    <button onClick={() => toast.dismiss(id)}>关闭</button>
  </div>
))

toast('持续显示', { duration: Infinity })
toast('指定挂载点', { toasterId: 'secondary', position: 'bottom-left' })
toast.getToasts()
toast.getHistory()

// 原有写法继续有效；destructive 映射到官方 error。
toast('保存成功', 'success')
toast('保存失败', 'destructive')
```

`useToast()` 仍需在 `ToastProvider` 内调用，返回的 `toast` 同样提供全部方法。`useSonner()` 在组件中调用，返回官方通知状态；官方类型可以从 `@/components/common/use-toast` 导入。无第二参数的 `toast(message)` 使用 Sonner 的普通通知样式。

官方参考：[toast API](https://sonner.emilkowal.ski/toast)、[Toaster 配置](https://sonner.emilkowal.ski/toaster)、[更新、关闭和状态查询](https://sonner.emilkowal.ski/other)。当前锁定版本为 Sonner 2.0.8，状态查询方法为 `getToasts()`；在线文档中的 `getActiveToasts()` 与该版本不一致，以已安装包的类型和实现为准。

安装时 ReUI 的 `base-nova/sonner` endpoint 返回 401，因此使用 shadcn 官方 Sonner registry 项；没有安装 ReUI Sonner，也没有修改 ReUI 原始组件。`next-themes` 是该 registry 项的依赖，项目主题仍由现有设置通过 props 传入。
