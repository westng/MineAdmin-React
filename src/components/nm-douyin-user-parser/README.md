# 抖音用户解析

React 组件 `NmDouyinUserParser`，使用现有 ReUI 基础组件 `Input`、`Button` 和 `Spinner`。输入框、主色“解析”按钮和描边“清空”按钮独立排列，通过 `gap-2` 分隔，保留各自圆角，与现有图标选择器的布局一致。

## 工程结构

```text
nm-douyin-user-parser/
  index.ts                              对外导出组件和类型
  components/nm-douyin-user-parser.tsx   界面、键盘操作和输入框焦点
  hooks/use-douyin-user-parser.ts        输入状态、请求取消、防重和回填
  api/douyin-user.ts                    接口请求与响应处理
  types/index.ts                        用户数据和组件属性契约
  utils/parser.ts                       链接解析、数据规范化和错误提取
```

依赖方向为 `components → hooks → api / utils`，类型统一放在 `types`。界面组件不直接请求接口，业务页面只通过组件入口和回调使用解析能力。

## 使用

```tsx
import NmDouyinUserParser from '@/components/nm-douyin-user-parser'

<NmDouyinUserParser
  disabled={saving}
  dataHandle={user => setForm(current => ({
    ...current,
    aweme_id: user.uid,
    aweme_name: user.nickname,
    aweme_avatar: user.avatar_thumb?.url_list[0] ?? '',
  }))}
/>
```

- `value` / `onChange` 控制链接；不传 `value` 时组件自行维护输入，也支持 `defaultValue`。
- `dataHandle(user)` 在解析成功后回填业务字段。`uid` 始终为字符串，其他用户数据保留；缺失的昵称或头像可安全读取。
- `disabled`、`readOnly`、`placeholder`、`id` 和输入框的无障碍属性均可传入。`className`、`style` 作用于组件外层。
- 组件不内置固定宽度或宽度上限，宽度由父容器布局或调用方的 `className`、`style` 决定；输入框自动伸缩，按钮保留自然宽度。
- 支持完整的抖音用户主页链接、带查询参数或锚点的链接，以及分享文字中的完整链接；短链接会提示改用主页链接。
- 回车触发解析，阻止误提交外层表单；请求期间防重复点击。修改链接、清空、禁用或卸载组件会取消旧请求，旧响应不会回填。
- “清空”只清空链接，不清除已经回填的业务字段。

接口沿用 `GET {VITE_APP_API_THIRDURL}/api/douyin/web/handler_user_profile`，参数为 `sec_user_id`，响应为 `{ code: 200, data: { user: { uid, nickname, avatar_thumb, ... } } }`。请求通过项目现有 HTTP 封装发送，超时为 10 秒；缺少配置或返回无效 UID 时显示错误，不调用回填函数。不要在 `VITE_` 环境变量中存放密钥。

当前接入达人分配、达人线下佣金的新增表单。直播账号在当前 React 前端尚无对应页面，可在迁移该页面时复用组件及头像回填方式。

## 验证

在 `web/` 运行 `pnpm exec node --test tests/nm-douyin-user-parser.test.mjs`，使用模拟接口验证组件交互与两个业务表单的回填、提交行为。
