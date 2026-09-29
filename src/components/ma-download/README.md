# MaDownload

通用下载按钮，使用 ReUI Button 样式。组件不依赖应用 Runtime、权限 Hook 或 HTTP 单例，请求能力由调用方提供。

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
<MaDownload request={({ signal }) => exportReport({ signal })} onError={error => console.error(error.message)}>
  导出报表
</MaDownload>
```

## 公共契约

`url`、`blob`、`request` 必须且只能提供一个，TypeScript 使用互斥联合约束。

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `url` | `string` | 相对地址或 HTTP(S)、Blob URL，使用浏览器原生下载链接 |
| `blob` | `Blob` | 本地二进制内容，支持 File |
| `request` | `({ signal }) => Promise<Blob \| MaDownloadResult>` | 自定义异步请求，组件不会自行发起 HTTP 请求 |
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
- 直链模式受浏览器和服务端策略约束，跨域地址可能忽略 `download` 属性而打开文件。需要强制下载或自定义认证头时，使用 `request` 获取 Blob；跨域请求由服务端正确配置 CORS。
- 同一组件的请求串行执行，连续点击不会重复请求。卸载或 React Activity 隐藏会取消信号，即使请求方忽略取消，晚到结果也不会触发下载或回调。修改来源不替换已开始的请求，下次点击使用新来源；`disabled` 不撤销已开始的请求。
- 组件创建的 Object URL 在触发下载后延迟 60 秒释放；触发失败立即释放，临时链接始终移除。外部传入的 Blob URL 由调用方负责释放。Blob 模式需要把内容放入内存，大文件可使用服务端签名直链。

## 工程结构与验证

```text
ma-download/
├── index.ts                   # 组件及公共类型出口
├── components/ma-download.tsx # 按钮、加载与错误展示
├── hooks/use-download.ts      # 请求状态、取消和回调
├── types/index.ts             # 输入来源及请求契约
└── utils/download-utils.ts    # 文件名、协议检查与浏览器下载
```

通过 `pnpm run check:ma` 验证类型、Lint 和行为，测试入口为 `tests/ma-components.test.mjs`、`tests/ma-components.types.tsx`。`ma-*` 已被公共导出规则和 Tailwind 源码扫描覆盖。
