# MaUpload

## 工程结构

```text
ma-upload/
├── index.ts                       # 公开入口：组件与公共类型
├── components/
│   ├── ma-upload.tsx              # 选择、拖放、状态和列表装配
│   └── upload-file-item.tsx       # 单个文件与缩略图展示
├── hooks/
│   └── use-upload.ts              # 受控状态、顺序上传、取消和回填
├── utils/
│   └── upload-utils.ts            # 纯校验、URL/文件名与大小处理
└── types/
    ├── index.ts                   # 单/多文件 Props、请求函数契约
    └── internal.ts                # 内部文件元数据与校验参数
```

业务仅从 `@/components/ma-upload` 导入。依赖方向为组件 → Hook → 纯工具/类型；展示子组件不请求接口，纯工具不依赖 React，Hook 不包含 JSX 或业务端点。上传能力由 `request` 参数注入。组件测试与类型契约分别位于 `tests/ma-components.test.mjs` 和 `tests/ma-components.types.tsx`，纳入 `check:ma`。

## 功能与使用

通用文件上传组件，支持文件选择、拖放、单文件和多文件、文件列表、移除、类型/大小/数量校验、上传状态、错误反馈及取消。默认接受任意文件类型，使用单文件和文本列表；大小与数量默认不限制，由调用方根据接口契约配置。

`request(file, { signal })` 由调用方提供，成功时返回文件 URL。组件不读取 Runtime，不内置 HTTP 地址、认证或业务接口；调用方必须传递取消信号。`onUploadingChange` 可用于阻止表单在上传期间保存。`disabled` / `readOnly` 禁止交互并取消进行中的上传，卸载时取消且不回填迟到结果。

单文件的 `value` / `defaultValue` / `onChange` 使用 URL 字符串，移除后为 `''`；`multiple: true` 时使用 URL 数组，移除后可为 `[]`。多文件按选择顺序上传，中途失败会停止后续请求，并保留原有文件和本批已上传成功的文件，用户可以重新选择失败文件重试。

`accept` 支持 MIME 类型、`image/*` 等类别以及 `.pdf,.zip` 等扩展名；`maxSize` 单位为字节，`maxCount` 限制文件总数。校验不替代上传服务端校验。`listType: 'text'` 显示文件名称，`listType: 'picture'` 显示图片缩略图；`previewSize` 默认 40px。上传得到的原始文件名会保留在当前控件中，已有 URL 则取路径末段作为名称。

MaForm 中声明 `render: 'Upload'`，通过 `renderProps` 提供配置。单文件映射字符串字段，多文件映射数组字段。编辑加载等外部数据通过模型字段回显，不触发重复上传。移除仅清空字段，不删除服务器上的附件。

```tsx
// 普通附件：文件类型、数量和大小按接口约定配置。
<MaUpload multiple value={files} onChange={setFiles} request={uploadFile}
  accept=".pdf,.docx,.xlsx,.zip" maxCount={10} maxSize={20 * 1024 * 1024} />

// 头像只是通用组件的一种配置。
<MaUpload value={avatar} onChange={setAvatar} request={uploadFile}
  accept="image/*" listType="picture" maxSize={5 * 1024 * 1024} previewSize={40} />
```
