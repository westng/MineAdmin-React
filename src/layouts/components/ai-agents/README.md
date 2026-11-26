# AI Agents 面板与输入区

面板通过 `shell.ai-agents` 挂载自定义内容。默认空状态在底部展示输入区；未提供发送处理器时，发送按钮禁用，不发送请求或模拟回答。自定义内容替换整个默认内容区，可自行复用输入组件。

标题栏通过独立的 `shell.ai-agents.header` 插槽扩展，公共 `AiAgentsHeader` 提供可配置名称、“新建会话”和“历史会话”两个图标。未设置名称时显示 `AI Agents`，未绑定回调的图标禁用。面板标题栏不再提供折叠按钮；桌面端通过主工具栏开关或 Escape 隐藏，移动端通过遮罩或 Escape 关闭并恢复焦点。

`AiAgentsHeader` 管理标题与操作的展示，`AiAgentsComposer` 管理底部输入。两者都可独立使用，无需默认 Runtime 或模型 SDK。标题是接入方控制的 `title` 属性：可来自用户保存的助手名称或应用配置；框架不内置重命名接口或本地持久化。标题更新不会重建内容或清空草稿，长标题单行截断并通过悬浮提示显示全文。

## 标题栏扩展

在插件的 `install(runtime)` 中注册一个标题栏组件。标题栏和内容区应共享插件持有的会话状态，各自订阅更新；每个面板只注册一个标题栏。下例中的 `createConversationClient` 和 `CustomAiPanel` 由接入插件实现，负责请求、历史界面及会话生命周期。

```tsx
import { useSyncExternalStore } from 'react'
import { AiAgentsHeader } from '@/layouts/components/ai-agents'
import type { PluginConfig } from '@/provider/plugins/host'
import { createConversationClient } from './services/conversation'
import { CustomAiPanel } from './components/custom-ai-panel'

export default {
  config: { enable: true, info: { name: 'example/assistant', version: '1.0.0' } },
  install(runtime) {
    const client = createConversationClient(runtime)
    function Header() {
      const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot)
      return (
        <AiAgentsHeader
          title={state.title}
          onNewSession={() => client.newSession()}
          onHistory={() => client.toggleHistory()}
          disabled={state.pending}
          historyExpanded={state.historyOpen}
        />
      )
    }
    const removeHeader = runtime.slots.register({
      id: 'example.assistant.header',
      slot: 'shell.ai-agents.header',
      component: Header,
    })
    const removeContent = runtime.slots.register({
      id: 'example.assistant.content',
      slot: 'shell.ai-agents',
      component: () => <CustomAiPanel client={client} />,
    })
    return () => {
      removeHeader()
      removeContent()
      client.dispose()
    }
  },
} satisfies PluginConfig
```

| `AiAgentsHeader` 属性 | 说明 |
| --- | --- |
| `title` | 显示名称；省略或空白时回退 `AI Agents`，按纯文本渲染 |
| `icon` | 可选 `ReactNode`，替换标题左侧图标，可用于接入方的助手头像；省略时使用默认机器人图标。接入方负责尺寸、动画及无障碍语义，装饰性头像使用 `aria-hidden` |
| `onNewSession` / `onHistory` | 两个图标的操作回调；缺少对应回调时禁用该按钮 |
| `disabled` | 同时禁用两个操作，例如加载或发送期间 |
| `newSessionDisabled` / `historyDisabled` | 分别控制可用状态 |
| `historyExpanded` / `historyControls` | 可选的历史区域展开状态及区域 ID，用于无障碍关联；区域不存在时省略 `historyControls` |
| `newSessionLabel` / `historyLabel` | 图标的无障碍名称与悬浮提示；Shell 内默认随语言切换，独立使用时默认中文 |

标题栏插槽接收 `pathname` 和 `userId`。桌面和移动端使用同一组件，并由 Shell 关联面板的可见标题；接入方不必自行创建抽屉标题或关闭按钮。账号切换会重建标题栏组件，插件仍应在会话版本变化时清理共享状态、旧请求和旧用户数据。卸载时撤销两项注册，框架恢复默认标题与禁用操作。

标题栏为名称与操作两列，名称列可收缩、按钮保持固定尺寸，保留 `1rem` 横向内边距。内容区不预设内边距，由插槽内容控制布局。它是面板内部的局部布局，面板仍遵循页面手机 4 栏、平板 8 栏、桌面 12 栏的边界和对齐规则。

## 底部输入区

桌面面板左侧提供与抽屉一致的 Separator：按住竖条时拉长并高亮，拖动调整面板宽度，双击恢复默认宽度。聚焦后可用左右方向键调宽（Shift 加大步长），Home／End 调至最小／最大宽度。宽度限制在 320–640px，并按相邻主内容的可用空间收窄上限；关闭面板后重开恢复默认宽度。移动端保持抽屉布局，不显示桌面分隔条。主内容和 AI 面板容器隐藏滚动条，仍支持滚动。

`AiAgentsComposer` 是项目基于 [ReUI InputGroup](https://reui.io/components/input-group)、`InputGroupTextarea` 和 `InputGroupButton` 组合的输入区，包含可选提示、可关闭状态条、多行输入、左右工具栏和底部说明。它不是直接安装的某个 ReUI 完整聊天区块，也不依赖 Runtime、业务 API 或模型 SDK。

默认面板展示添加、思考、搜索、语音及发送入口。思考与搜索只切换示例 UI 的选中状态；尚未接入的添加、语音和发送入口禁用，不请求麦克风权限、不上传文件、不调用 AI 服务。工具数量、上下文用量、套餐和条款由接入方提供，不内置示例数值或无效链接。

```tsx
import { useState } from 'react'
import { AiAgentsComposer } from '@/layouts/components/ai-agents'

export function CustomAiPanel({ onSend }: { onSend: (message: string) => void }) {
  const [draft, setDraft] = useState('')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="min-h-0 flex-1 overflow-y-auto">对话内容由接入方渲染</div>
      <AiAgentsComposer value={draft} onValueChange={setDraft} onSend={onSend} />
    </div>
  )
}
```

| 属性 | 说明 |
| --- | --- |
| `value` / `onValueChange` | 受控输入，调用方拥有草稿 |
| `onSend` | 发送去掉首尾空白的文本；未传入时禁用发送 |
| `disabled` | 禁用输入和发送 |
| `pending` | 显示发送中状态并禁用输入和重复发送，由调用方控制 |
| `placeholder` / `sendLabel` / `hint` | 输入提示、按钮名称与快捷键说明；`hint` 提供读屏说明及发送按钮悬浮提示 |
| `notice` | 输入区上方的自定义提示，例如接入方提供的条款说明 |
| `status` / `onDismissStatus` / `dismissStatusLabel` | 顶部状态内容、关闭回调与关闭按钮名称；状态可放摘要或自定义下拉控件 |
| `actions` / `trailingActions` | 左右工具栏内容，可放开关、工具计数或其他按钮；调用方负责状态和事件，按钮应声明 `type="button"` |
| `footer` | 输入区下方的说明内容 |

Enter 触发发送，Shift + Enter 保留换行，中文输入法确认候选词时不发送。空白输入不能发送。输入高度随内容增长，到达上限后在输入框内滚动；外层使用纵向 Flex 布局将输入区放在底部。

传入 `actions` 与 `trailingActions` 的控件由调用方管理可用状态，建议在 `disabled` 或 `pending` 时同步禁用会影响本次发送的工具。状态提示关闭后是否再次显示也由调用方决定。窄屏工具栏允许换行，发送区域保持可见。

组件不自动清空草稿。调用方在自己的逻辑确认发送成功后更新 `value`，并自行处理异步请求、错误与 `pending` 状态。面板隐藏后内容卸载，需要跨隐藏保留的草稿由调用方放在组件外管理。
