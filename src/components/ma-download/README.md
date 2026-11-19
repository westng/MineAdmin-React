# MaDownload

通用下载按钮，使用 ReUI Button 样式，并复用框架 Shadcn Sonner 通知展示准备、传输进度、完成、失败与取消。组件不依赖应用 Runtime、权限 Hook 或 HTTP 单例，鉴权请求和下载票据由调用方提供。独立无 ToastProvider 场景保留按钮与内联错误。

```tsx
import { MaDownload } from '@/components/ma-download'

// 公开文件或已签名的直链。
<MaDownload url="/files/template.xlsx" filename="导入模板.xlsx">
  下载模板
</MaDownload>

// 已在客户端生成的内容，也可以传入 File。
<MaDownload blob={new Blob(['name\nexample'], { type: 'text/csv;charset=utf-8' })} filename="名单.csv" />

// 需要鉴权或审计的下载通过现有业务 API 适配，透传取消信号。
// exportReport 的返回契约为 Promise<{ blob: Blob; filename?: string }>。
<MaDownload request={({ signal, onProgress }) => exportReport({ signal, onProgress })} onError={error => console.error(error.message)}>
  导出报表
</MaDownload>
```

## 公共契约

`url`、`blob`、`request` 必须且只能提供一个，TypeScript 使用互斥联合约束。

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `url` | `string` | 相对地址或 HTTP(S)、Blob URL，流式接收文件并展示真实字节进度 |
| `blob` | `Blob` | 本地二进制内容，支持 File |
| `request` | `({ signal, onProgress }) => Promise<Blob \| MaDownloadResult \| MaDownloadUrlResult>` | 自定义鉴权请求可回报 `{ loaded, total? }`；返回 `{ url, filename? }` 时继续接收票据对应文件 |
| `filename` | `string` | 显式文件名，优先于请求返回的文件名和 File.name |
| `children` / `loadingText` | `ReactNode` | 默认“下载”/“下载中…” |
| `icon` | `ReactNode` | 默认下载图标，传 `null` 隐藏；加载时显示旋转图标 |
| `variant` / `size` | ReUI Button 对应属性 | 默认 `outline` / `sm` |
| `disabled` | `boolean` | 禁止发起新下载 |
| `className` / `wrapperClassName` | `string` | 分别作用于按钮和包含错误提示的容器 |
| `onDownloadingChange` | `(downloading: boolean) => void` | 请求开始和结束通知，卸载时也会结束 |
| `onSuccess` | `() => void` | 已触发浏览器下载，不代表磁盘保存完成 |
| `onError` | `(error: Error) => void` | 请求或触发下载失败；同时显示内联错误，支持重试 |

支持原生按钮属性、`ref` 和 `onClick`；`onClick` 中调用 `preventDefault()` 可阻止本次下载。按钮固定为 `type="button"`，避免提交外层表单。异步期间禁用按钮，并提供 `aria-busy`；错误通过 `role="alert"` 和 `aria-describedby` 关联。

## 行为边界

- `request` 应复用业务 API 的鉴权、刷新 Token、权限与审计流程，校验响应并返回有效 Blob。若服务端用 JSON 返回错误，适配层应识别并抛错；组件不猜测业务响应结构，也不从 Blob 中判断业务成功。
- 服务端 `Content-Disposition` 文件名由请求适配层解析后传入 `MaDownloadResult.filename`。优先级为显式 `filename` → 请求结果文件名 → `File.name` → `download`；直链未指定文件名时使用 URL 路径末段。文件名中的路径分隔符和控制字符会被替换。
- URL 模式使用 fetch 与 ReadableStream 接收文件，HTTP 错误、截断和取消不触发保存。跨域请求需要服务端正确配置 CORS，不向跨域节点发送后台认证头或 Cookie。已知总量时显示百分比，否则显示已接收大小和不定进度，不模拟百分比。
- 文件接收完成后以 Blob 交给浏览器保存；完成通知不代表磁盘保存完成。当前实现缓存文件内容，大文件需评估浏览器可用内存。
- 同一组件的请求串行执行，连续点击不会重复请求。卸载或 React Activity 隐藏会取消信号，即使请求方忽略取消，晚到结果也不会触发下载或回调。修改来源不替换已开始的请求，下次点击使用新来源；`disabled` 不撤销已开始的请求。
- 组件创建的 Object URL 在触发下载后延迟 60 秒释放；触发失败立即释放，临时链接始终移除。外部传入的 Blob URL 由调用方负责释放。URL 和 Blob 模式均需要浏览器缓存文件内容。

## 工程结构与验证

```text
ma-download/
├── index.ts                   # 组件及公共类型出口
├── components/                # 下载按钮与通知进度视图
├── hooks/                     # 按钮生命周期与命令式 useFileDownload
├── types/index.ts             # 输入来源、进度及请求契约
└── utils/                     # 流式接收、文件保存与 Sonner 通知
```

命令式入口使用同一公共模块的 `useFileDownload()`，调用 `{ url | blob | request, filename?, signal?, onProgress? }` 后返回是否成功；组件卸载或 Activity 隐藏会取消未完成下载。需要将错误交给已有队列处理时使用 `downloadFile(task, toast?)`，该函数保留异常。通知能力只使用当前 ToastProvider 的 API。

通过 `pnpm run check:ma` 验证类型、Lint 和行为，测试入口为 `tests/ma-components.test.mjs`、`tests/framework-download.test.mjs`、`tests/ma-components.types.tsx`。`ma-*` 已被公共导出规则和 Tailwind 源码扫描覆盖。
