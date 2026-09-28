# 页面顶部操作

页面组件可以使用 `useHeaderActions` 将页面专属操作注入顶部右侧区域。

```tsx
import { Button } from '@/components/reui/primitives/button'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'

export function ExamplePage() {
  useHeaderActions(<Button>新增记录</Button>)

  return <div>页面内容</div>
}
```

`useHeaderActions` 依赖布局中的 `HeaderActionsProvider`；没有 Provider 时不注入内容。页面卸载或 Activity 隐藏导致 Effect 清理时，会清除当前操作。没有页面注入时仅此操作区域为空，主题、账号菜单和其他 Shell 工具仍由布局渲染。
