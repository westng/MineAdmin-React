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
