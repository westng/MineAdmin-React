# Base module

`base` 保存框架基础业务。根目录只保留按业务拆分的子模块，不放跨页面的 `api`、`locales`、`utils` 或注册文件。

```text
base/
├── auth/                # 登录与当前用户认证
├── dashboard/           # 框架首页空壳；业务通过 Dashboard Slot 注入
├── permission/          # 权限业务及其用户、角色、菜单、部门子模块
├── user-center/         # 个人资料与附件
├── account-settings/    # 账号偏好与安全设置
├── settings/            # 系统外观设置
├── clinic/              # 基础占位业务页面
└── dynamic-menu/        # 动态菜单承载页

<sub-module>/
├── api/                 # 当前子模块的接口与数据类型
├── locales/             # 当前子模块使用的多语言资源
├── register-*.ts        # 当前子模块的全局注册（按需创建）
└── views/
    ├── components/      # 页面专属组件
    ├── data/            # 页面静态配置或数据转换（按需创建）
    └── index.tsx        # 页面入口
```

页面之间确需复用时，直接从拥有该接口或组件的子模块导入，不通过 `base` 根目录转发。全局无业务语义的工具放在 `src/utils`，例如 `api-data.ts`。`permission` 下的页面继续按用户、角色、菜单、部门等具体子模块维护自己的 `api/locales/views`。

## 页面表格规范

- `base` 下的列表、管理表格和弹窗内数据表统一使用 `MaProTable`，页面不得直接组装 `DataGrid`、`useTable` 或原生 `<table>`。
- 列配置使用 `MaProTableColumns<T>`；普通内容通过 `prop`、`cellRender` 或 `formatter` 表达，操作通过 `operationConfigure.actions` 表达。
- 表格请求、分页、搜索、选择和刷新交给 `MaProTable` 的 `options`，页面只负责传入业务数据、权限和回调。
- 需要内联编辑时，在 `cellRender` 中使用现有表单控件；不要为单个页面重新实现表格状态、分页或操作列布局。
- 卡片网格等非表格布局可以保留专用组件；一旦使用表格行列展示数据，必须回到 `MaProTable`。
