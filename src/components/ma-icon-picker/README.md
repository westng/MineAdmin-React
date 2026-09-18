# MaIconPicker

Vue `ma-icon-picker` 的 React 迁移版，使用当前 shadcn/Base UI 的 Dialog、Tabs、InputGroup 和 Button 组合。组件只负责图标选择，通过受控值交给表单保存，不依赖业务 API、路由或全局状态。

```tsx
import { MaIconPicker } from '@/components/ma-icon-picker'
import { MaIcon } from '@/components/ma-icon'

<MaIconPicker value={icon} onChange={setIcon} />
<MaIcon name={icon} className="size-5" />
```

- 输入框、“选择图标”和“清空”为三个独立控件，通过 `gap-2` 分隔，保留各自圆角。点击输入框或“选择图标”打开弹窗；选中后触发 `onChange` 并关闭，清空返回空字符串。关闭或按 Esc 取消不会改值。
- 支持分类内搜索（忽略大小写与首尾空格）、分页、已选项高亮，重新打开会定位到已有图标所在分类和页码。
- 默认每页 70 个图标，可通过 `pageSize` 调整；支持 `disabled`、`readOnly`、`id`、`name`、`ref`、`onBlur` 和字段 ARIA 属性。与表单组合时在标签上设置对应的 `htmlFor`。
- 图标索引和面板按需加载；图标内容使用现有 `@iconify/react` 的批量加载与缓存。加载中显示占位，加载失败、超时或失效时禁选，并在图标提示中说明。网络恢复后可刷新页面重试。
- `web/src/assets/icons/catalog.json` 沿用参考仓库的九组图标索引及作者、许可元数据，保留 Ant Design、Element Plus、Flagpack、HeroIcons、MDI、Remix、SVG Logos、Twitter Emoji、VSCode Icons。它是索引快照，不会自动新增官方图标；SVG 内容仍需联网加载。
- 自定义图标放在 `web/src/assets/icons/*.svg`，由 Vite 自动发现。值为不带扩展名的文件名，例如 `company-logo.svg` 对应 `company-logo`；Iconify 图标仍返回 `prefix:name`。当前自定义目录为空，弹窗显示空状态。新增文件后重新启动开发服务或在下次获准构建时生成资源。
- 菜单树、导航栏和选择器预览统一使用 `MaIcon`，兼容 Iconify、自定义 SVG 及旧的 `i-prefix:name` 显示值；目录外的未知图标保留原字段值并显示不可用占位，不自动清空。

API 依据：[shadcn Base UI Input Group](https://ui.shadcn.com/docs/components/base/input-group)、[Base UI Dialog](https://base-ui.com/react/components/dialog)、[Iconify loadIcons](https://iconify.design/docs/icon-components/react/load-icons.html)。

分类方向在面板内使用官方 `TabsPrimitive.Root`：当前安装的 `components/reui/primitives/tabs.tsx` 未向 Root 传递 `orientation`，且其方向样式匹配 `data-vertical` / `data-horizontal`，而当前 Base UI 实际输出 `data-orientation`。面板保留官方 TabsList、TabsTrigger、TabsContent，局部按真实属性配置方向、尺寸和滚动，桌面显示左侧纵向列表，窄屏显示横向分类；无需修改全局 registry 源码。参见 [Base UI Tabs API](https://base-ui.com/react/components/tabs)。
