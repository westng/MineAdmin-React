# MaDrawer

`MaDrawer` 是项目级抽屉封装，基于 `components/ui/sheet` 组合，保留 Base UI 的焦点管理、遮罩和 Esc 关闭行为。

默认右侧抽屉采用目标站的悬浮面板样式：距视口边缘 `16px`、最大宽度 `480px`、圆角面板、标题和底部操作区带分隔线，正文区域独立滚动。通过 `contentClassName`、`headerClassName`、`bodyClassName` 和 `footerClassName` 可按页面需求覆盖布局。

## 基础用法

```tsx
<MaDrawer open={open} onOpenChange={setOpen} title="用户详情" description="查看用户信息">
  <UserDetails />
</MaDrawer>
```

默认 footer 提供“确定”和“取消”。传入 `footer={false}` 可隐藏默认操作区；`side` 支持 `top`、`right`、`bottom`、`left`。

## 异步确认

```tsx
<MaDrawer
  open={open}
  onOpenChange={setOpen}
  title="编辑用户"
  onOk={async ({ close }) => {
    await save()
    close()
  }}
  onActionError={error => reportError(error)}
>
  <Form />
</MaDrawer>
```

异步 `onOk` 或 `onCancel` 执行期间会自动显示 loading；返回 `false` 可以保持抽屉打开。`Ctrl/⌘ + Enter` 会触发确认。

## Hook 控制

```tsx
const drawer = useMaDrawer<[User]>()

<MaDrawer {...drawer.props}>
  {drawer.args[0] && <UserDetails user={drawer.args[0]} />}
</MaDrawer>

<Button onClick={() => drawer.open(user)}>查看</Button>
```

`useMaDrawer` 提供 `open`、`close`、`setTitle`、`setAttributes`，适合从列表操作打开并传递参数的页面。
