# MaDialog

`MaDialog` 是项目级对话框封装，基于 `components/ui/dialog` 组合，不修改官方 ReUI 或 Base UI 源码。

默认对话框沿用目标站的 ReUI 壳层：响应式 `sm` 宽度、圆角面板、轻量边框光环和官方底部操作区；需要更宽的业务内容时，通过 `contentClassName` 覆盖，而不是修改全局基础组件。

## 基础用法

```tsx
<MaDialog open={open} onOpenChange={setOpen} title="编辑用户" description="填写用户信息">
  <UserForm />
</MaDialog>
```

默认 footer 提供“确定”和“取消”。传入 `footer={false}` 可隐藏默认操作区，也可以通过 `footer`、`footerBefore` 和 `footerAfter` 组合自定义操作。

## 高度与滚动

`height` 设置固定高度，`maxHeight` 设置最大高度，均接受 CSS 尺寸字符串或数字（像素）。默认高度随内容自适应，最大高度为 `calc(100dvh - 2rem)`，超出后仅正文滚动，标题和底部操作区保持可见。

```tsx
<MaDialog open={open} onOpenChange={setOpen} title="编辑飞书连接" maxHeight="80dvh">
  <ConnectionForm />
</MaDialog>
```

需要固定高度时可传入 `height={640}`，同时仍受 `maxHeight` 限制。`useMaDialog({ height: 640, maxHeight: '80dvh' })` 和 `setAttributes` 也支持这两个参数。

显式尺寸参数优先于 `popupProps.style` 中的同名样式，其余 Popup 样式和函数式 `style` 保持兼容。全屏时由封装统一使用视口高度，退出后恢复原尺寸；业务页面无需维护额外的全屏状态或滚动布局。

## 异步确认

```tsx
<MaDialog
  open={open}
  onOpenChange={setOpen}
  title="保存变更"
  onOk={async ({ close }) => {
    await save()
    close()
  }}
  onActionError={error => reportError(error)}
>
  <Form />
</MaDialog>
```

异步 `onOk` 或 `onCancel` 执行期间会自动显示 loading；返回 `false` 可以保持弹窗打开。`Ctrl/⌘ + Enter` 会触发确认。

## Hook 控制

```tsx
const dialog = useMaDialog<[User]>()

<MaDialog {...dialog.props}>
  {dialog.args[0] && <UserForm user={dialog.args[0]} />}
</MaDialog>

<Button onClick={() => dialog.open(user)}>编辑</Button>
```

`useMaDialog` 提供 `open`、`close`、`setTitle`、`setAttributes`，适合需要从列表操作打开并传递参数的页面。

## Base UI 扩展契约

`MaDialogProps<Payload>` 继承当前安装版本的 `Dialog.Root.Props<Payload>`。Root 的 `modal/actionsRef/handle/triggerId/defaultTriggerId/onOpenChangeComplete` 可直接传入；`children` 也保留函数形式和载荷类型。

```tsx
const handle = Dialog.createHandle<{ name: string }>()

<Dialog.Trigger handle={handle} payload={{ name: '张三' }}>查看</Dialog.Trigger>
<MaDialog
  handle={handle}
  title="详情"
  onOpenChange={(open, details) => {
    if (!open && hasUnsavedChanges) details.cancel()
  }}
  popupProps={{ 'aria-label': '用户详情', initialFocus: false }}
  portalProps={{ container: document.body }}
  closeProps={{ 'aria-label': '关闭详情' }}
>
  {({ payload }) => payload?.name}
</MaDialog>
```

示例中的 `Dialog` 从 `@base-ui/react/dialog` 导入。`onOpenChange(open, eventDetails)` 保留原因、原始事件和 `cancel()/preventUnmountOnClose()`；只接收一个参数的旧回调仍兼容。默认确认/取消操作通过 Base UI 的 `actionsRef.close()` 关闭，因此同样遵守取消事件。

`popupProps`、`portalProps`、`backdropProps`、`closeProps` 分别接收对应原语属性。Popup 的 `children` 由 Ma 正文和操作区管理；其他部位的配置直接传入。Popup 和遮罩的函数式 `className` 会与基础样式合并。顶层 `initialFocus/finalFocus` 优先于 `popupProps` 中同名配置，`contentClassName` 与 Popup class 合并。需要自定义关闭按钮可通过 `closeProps.render/children`。
