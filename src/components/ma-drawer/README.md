# MaDrawer

`MaDrawer` 是项目级抽屉封装，基于 `components/reui/primitives/sheet` 组合，保留 Base UI 的焦点管理、遮罩和 Esc 关闭行为。

默认右侧抽屉采用悬浮面板样式：距视口边缘 `16px`、初始宽度最大 `480px`、圆角面板、标题和底部操作区带分隔线，正文区域独立滚动。通过 `width`、`contentClassName`、`headerClassName`、`bodyClassName` 和 `footerClassName` 可按页面需求覆盖布局。

## 基础用法

```tsx
<MaDrawer open={open} onOpenChange={setOpen} title="用户详情" description="查看用户信息">
  <UserDetails />
</MaDrawer>
```

默认 footer 提供“确定”和“取消”。传入 `footer={false}` 可隐藏默认操作区；`side` 支持 `top`、`right`、`bottom`、`left`；`width` 可传入 CSS 宽度值，例如 `width="50%"`。

## 拖动调宽

左右抽屉默认在面向页面的一侧、面板外部显示可拖动的竖向 separator。手柄不占用正文空间，抽屉内容通过独立圆角层裁切。鼠标左键按住手柄时，竖条在 `150ms` 内从中央加长至两倍，松开、取消拖动或窗口失焦后恢复；系统启用减少动态效果时跳过过渡动画。调用方无需修改现有用法；`width` 仍决定初始宽度，支持像素数值、百分比和 `min()/calc()` 等 CSS 值。拖动从面板实际宽度开始，仅修改当前实例本次打开的显示宽度，不回写调用方属性或 `useMaDrawer` 配置。关闭重开、变更 `width/side/resizable` 后恢复调用方配置。

拖动宽度限制在 `320px` 至视口宽度减去两侧 `1rem` 的范围；窄视口优先保留边距。Tab 聚焦 separator 后，可用左右方向键移动边缘（每次 `16px`，按住 Shift 为 `64px`），Home/End 调至最小/最大宽度；双击恢复初始宽度。正文、表单输入和原有 Popup 样式保留。

传入 `resizable={false}` 可关闭调宽；顶部和底部抽屉不显示此 separator。

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

## Base UI 扩展契约

Sheet 使用 Base UI Dialog 原语。`MaDrawerProps<Payload>` 保留 Root 的所有公开属性和带类型的函数式 `children`，按部位支持 `popupProps/portalProps/backdropProps/closeProps`，用法与 [MaDialog](../ma-dialog/README.md) 一致。

`onOpenChange(open, eventDetails)` 提供真实关闭原因并支持 `cancel()`；确认、取消和外部 `actionsRef.close()` 也走同一事件链。只接受布尔值的旧回调保持兼容。

顶层 `initialFocus/finalFocus` 优先于 Popup 同名设置。`popupProps.style` 支持状态函数；初始布局中，`width` 仅在明确传入时覆盖其中的 `width`，拖动后临时宽度优先，其余样式保留。`showCloseButton: false` 关闭内置关闭按钮，`closeProps.render/children` 可替换按钮内容。`footerAlign` 支持 `left/center/right`。

## 工程结构

根目录 `index.ts` 仅提供公共导出，类型集中到 `types/`。结构约束见 [Ma 组件工程规范](../../../docs/MA_COMPONENTS.md)。

| 目录 | 职责 | 文件 |
| --- | --- | --- |
| `components/` | 展示组件 | ma-drawer.tsx |
| `hooks/` | 状态、生命周期与拖动调宽 | use-ma-drawer.ts、use-ma-drawer-resize.ts |
| `types/` | 公共及内部类型 | index.ts |

使用 `pnpm run check:ma` 验证结构、类型、Lint 和行为；迁移验证同时覆盖应用消费者与依赖边界。
