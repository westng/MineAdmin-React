# Header action slot

页面组件可以使用 `useHeaderActions` 将页面专属操作注入顶部右侧区域。

```tsx
import { Button } from '@/components/ui/button'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'

export function ExamplePage() {
  useHeaderActions(<Button>新增记录</Button>)

  return <div>页面内容</div>
}
```

页面卸载后，插槽内容会自动清理。没有页面注入时，顶部右侧区域保持为空。
