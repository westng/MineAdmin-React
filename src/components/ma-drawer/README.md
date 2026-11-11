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

## 头部样式

头部样式由 `header.variant` 显式选择。未传 `header`、传入 `{}` 或 `{ variant: 'default' }` 时，使用原有基础样式，保留标题、说明、内边距和关闭入口。

| 选择                                      | 用途                                                        |
| ----------------------------------------- | ----------------------------------------------------------- |
| 不传 `header` 或 `{ variant: 'default' }` | 基础样式：标题与说明                                        |
| `{ variant: 'style-1', ... }`             | 样式一：编号、状态、导航和业务操作等详情头部                |
| `false`                                   | 不渲染默认头部，由调用方在正文上下文中组合 `MaDrawerHeader` |

### 样式一

需要编号、状态或操作时，通过 `header={{ variant: 'style-1', ... }}` 提供内容。基础样式不接受这些扩展区域，TypeScript 会提示补齐样式选择：

```tsx
<MaDrawer
  open={open}
  onOpenChange={handleOpenChange}
  title="编辑记录"
  description="检查记录内容并保存修改"
  header={{
    variant: 'style-1',
    meta: 'ID: 123',
    metaExtra: (
      <Button size="icon-sm" variant="ghost" aria-label="复制编号" onClick={copyId}>
        <Copy />
      </Button>
    ),
    titleExtra: <Badge>草稿</Badge>,
    descriptionIcon: <Info />,
    actions: <Button onClick={refresh}>刷新</Button>,
  }}
>
  <RecordForm />
</MaDrawer>
```

| 样式一属性        | 内容与布局                                                   |
| ----------------- | ------------------------------------------------------------ |
| `meta`            | 编号或辅助信息；单行截断，字符串自动提供完整文本提示         |
| `metaExtra`       | 紧邻编号的附加内容，例如复制编号按钮；独立占位，不随编号截断 |
| `titleExtra`      | 状态等附加内容；紧邻标题并与首行顶部对齐，空间不足时换行     |
| `descriptionIcon` | 说明前的装饰图标；独立占位，换行后文字保持对齐               |
| `actions`         | 刷新、导航、更多等业务操作；自动排列并在空间不足时换行       |
| `toolbar`         | 说明下方的主要业务操作，保留在头部分隔线之前                 |
| `bottom`          | 固定在标题区下方的 Tabs 或工具栏；共用横向间距和分隔线       |

样式一各区域接受 `ReactNode`，未提供内容时不生成对应区域。样式一使用命名容器查询：宽度低于 `24rem` 时收紧辅助信息与右侧操作的间距，编号可截断，操作区按可用空间换行；标题和状态按实际内容宽度自然换行。判断依据是抽屉内头部宽度，拖动调宽也会生效。两种样式的可见标题和说明都直接使用 `SheetTitle`、`SheetDescription`，无需额外隐藏一份标题。

Header、扩展区、正文和 footer 共用 `--ma-drawer-padding-x`，默认 `1.25rem`。需要整体调整时可设置 `contentClassName="[--ma-drawer-padding-x:1rem]"`；`headerClassName` 继续覆盖标题区的样式。自定义滚动区可使用 `px-[var(--ma-drawer-padding-x)]`，避免叠加默认正文 padding。

### 组合 Tabs 或依赖子组件状态

当标题数据、操作和 Tabs 状态由子组件维护时，传入 `header={false}`，在原有上下文中使用公共 `MaDrawerHeader`。每个抽屉只放一个头部；`title`、`description` 此时直接传给 `MaDrawerHeader`。关闭按钮继续由外层 `MaDrawer` 渲染，子组件无需手写关闭入口。

```tsx
<MaDrawer
  open={open}
  onOpenChange={handleOpenChange}
  header={false}
  bodyClassName="flex min-h-0 flex-col overflow-hidden p-0"
  footer={false}
>
  <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 flex-col gap-0">
    <MaDrawerHeader
      variant="style-1"
      title="记录详情"
      meta="RECORD-123"
      bottom={
        <TabsList variant="line">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="history">历史</TabsTrigger>
        </TabsList>
      }
    />
    <TabsContent value="overview" className="min-h-0 overflow-y-auto px-[var(--ma-drawer-padding-x)] py-5">
      <RecordOverview />
    </TabsContent>
    <TabsContent value="history" className="min-h-0 overflow-y-auto px-[var(--ma-drawer-padding-x)] py-5">
      <RecordHistory />
    </TabsContent>
  </Tabs>
</MaDrawer>
```

`MaDrawerHeader` 必须位于 `MaDrawer` 内，沿用其无障碍上下文，并自动根据 `showCloseButton` 预留关闭空间。操作权限、刷新和记录切换由调用方负责。保存中需要阻止关闭时，仍在 `onOpenChange` 调用 `details.cancel()`；可同时通过 `closeProps={{ disabled: saving }}` 禁用关闭按钮。`loading` 本身不替代业务关闭拦截。

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

`useMaDrawer` 提供 `open`、`close`、`setTitle`、`setHeader`、`setAttributes`，适合从列表操作打开并传递参数的页面。`setHeader` 完整替换头部配置，切换样式不重置正文输入、抽屉宽度或打开状态；`setAttributes({ header })` 也支持同一配置。

```tsx
const drawer = useMaDrawer({
  title: '记录详情',
  header: { variant: 'style-1', meta: 'RECORD-123' },
})

// 在事件处理函数中更新样式一及其内容。
drawer.setHeader({ variant: 'style-1', meta: 'RECORD-456', titleExtra: <Badge>已启用</Badge> })

// 恢复基础样式，清除之前样式的扩展内容。
drawer.setHeader({ variant: 'default' })
// 也可使用 drawer.setHeader(undefined)。
```

### 公共类型与后续样式扩展

从 `@/components/ma-drawer` 导入 `MaDrawerHeaderOptions`、`MaDrawerHeaderVariant`、`MaDrawerDefaultHeaderOptions`、`MaDrawerStyleOneHeaderOptions` 和 `MaDrawerHeaderProps`。样式配置是带 `variant` 判别字段的联合类型，只有样式一允许编号和操作等扩展内容。

基础样式与样式一在 `components/` 中分别实现，`MaDrawerHeader` 是统一分发入口。组件维护者新增样式时，增加对应配置类型和渲染分支，并补齐示例、类型与行为验证；既有 `default` 与 `style-1` 的名称和布局契约保持稳定。当前内置样式只有这两种，`style-2` 等未实现值不属于有效配置。

## Base UI 扩展契约

Sheet 使用 Base UI Dialog 原语。`MaDrawerProps<Payload>` 保留 Root 的所有公开属性和带类型的函数式 `children`，按部位支持 `popupProps/portalProps/backdropProps/closeProps`，用法与 [MaDialog](../ma-dialog/README.md) 一致。

`onOpenChange(open, eventDetails)` 提供真实关闭原因并支持 `cancel()`；确认、取消和外部 `actionsRef.close()` 也走同一事件链。只接受布尔值的旧回调保持兼容。

顶层 `initialFocus/finalFocus` 优先于 Popup 同名设置。`popupProps.style` 支持状态函数；初始布局中，`width` 仅在明确传入时覆盖其中的 `width`，拖动后临时宽度优先，其余样式保留。`showCloseButton: false` 关闭内置关闭按钮，`closeProps.render/children` 可替换按钮内容。`footerAlign` 支持 `left/center/right`。

## 工程结构

根目录 `index.ts` 仅提供公共导出，类型集中到 `types/`。结构约束见 [Ma 组件工程规范](../../../docs/MA_COMPONENTS.md)。

| 目录          | 职责                     | 文件                                                                                              |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `components/` | 抽屉、头部入口与独立样式 | ma-drawer.tsx、ma-drawer-header.tsx、ma-drawer-default-header.tsx、ma-drawer-style-one-header.tsx |
| `context/`    | 组合式头部的关闭占位配置 | header-context.ts                                                                                 |
| `hooks/`      | 状态、生命周期与拖动调宽 | use-ma-drawer.ts、use-ma-drawer-resize.ts                                                         |
| `types/`      | 公共及内部类型           | index.ts                                                                                          |

使用 `pnpm run check:ma` 验证结构、类型、Lint 和行为；迁移验证同时覆盖应用消费者与依赖边界。

## 缓存页面与操作状态

每次打开拥有独立的异步操作会话。关闭后重开，前一次操作的返回值、错误以及 action context 的 close/setLoading 都不能影响新抽屉；当前会话仍遵守原有自动关闭与取消事件约定。
