# 框架基础页面子模块

`base` 是框架基础页面的父目录。它的直接子目录就是各个页面子模块；`api`、`locales`、`views` 和按需创建的 Hook、注册文件都属于对应子模块，不放在 `base` 根目录，也不再增加 `permission` 等中间分组。

```text
base/
├── login/               # 登录页面与登录页配置
├── dashboard/           # 框架首页空壳；业务通过 Dashboard Slot 注入
├── user/                # 用户管理
├── role/                # 角色管理
├── menu/                # 菜单管理
├── department/          # 部门管理
├── login-log/           # 登录日志
├── operation-log/       # 操作日志及通用日志协议、展示组件
├── attachment/          # 附件管理
├── user-center/         # 个人资料
├── account-settings/    # 账号偏好与安全设置
└── settings/            # 系统外观设置

<sub-module>/
├── api/                 # 当前子模块的接口与数据类型
├── locales/             # 当前子模块使用的多语言资源
├── hooks/               # 可复用状态或生命周期 Hook（按需创建）
├── register-*.ts        # 当前子模块的全局注册（按需创建）
└── views/
    ├── components/      # 页面专属组件
    ├── data/            # 页面静态配置或数据转换（按需创建）
    └── index.tsx        # 页面入口
```

页面之间确需复用时，从拥有该接口或组件的子模块显式导入，不通过 `base` 根目录聚合。登录日志复用操作日志模块的通用协议、表格和弹窗，各自的页面入口与专属文案仍归对应子模块。个人资料更新接口由 `user-center` 维护，附件接口由 `attachment` 维护。

没有独立请求的框架首页在 `api/README.md` 中说明接口边界，业务卡片的请求仍由各自业务模块维护。`pnpm run check:modules` 会检查直接子模块结构，并拒绝 `base/api`、`base/views`、`base/locales` 和额外的中间分组。

## 页面表格规范

- `base` 下的列表、管理表格和弹窗内数据表统一使用 `MaProTable`，页面不得直接组装 `DataGrid`、`useTable` 或原生 `<table>`。
- 列配置使用 `MaProTableColumns<T>`；普通内容通过 `prop`、`cellRender` 或 `formatter` 表达，操作通过 `operationConfigure.actions` 表达。
- 表格请求、分页、搜索、选择和刷新交给 `MaProTable` 的 `options`，页面只负责传入业务数据、权限和回调。
- 需要内联编辑时，在 `cellRender` 中使用现有表单控件；不要为单个页面重新实现表格状态、分页或操作列布局。
- 卡片网格等非表格布局可以保留专用组件；一旦使用表格行列展示数据，必须回到 `MaProTable`。

## CRUD 页面组合

- 用户、角色、部门、菜单及日志管理使用 `MaProTable`、`MaForm`、`MaDialog` / `MaDrawer` 组合；普通字段定义、校验规则和输入转换放在各自的 `views/data/`。
- 新增和编辑弹窗直接使用 `useMaFormDialog`，由框架处理回填、必填校验、保存状态、重复提交和失败后保留输入。弹窗较大时放入 `views/components/`，不再额外封装只转发 CRUD 状态的业务 Hook。
- 普通删除确认使用 `useMaConfirm`，执行前再次检查操作权限，成功后刷新列表并清理失效选择。菜单右侧的内联编辑仍使用 `MaForm`，按钮权限的行内编辑仍由 `MaProTable` 承载。
- 部门树、菜单树、角色权限树等专用交互保留各自组件；它们的新增、编辑和删除仍遵循上述表单与确认约定。
- `user/hooks/use-user-queries.ts` 提供共享查询生命周期。附件的 Hook 负责跨网格/列表的查询状态、上传进度和取消、批量删除的部分失败及重试，属于专用交互，不作为普通 CRUD 页面模板。
- 登录、dashboard、个人资料与账户/系统设置是专用页面，不要求套用列表型 CRUD 布局。

## 菜单组件路径

- `meta.componentPath` 指定 `modules/` 或 `plugins/`；缺省时只接受能够唯一匹配的地址。菜单编辑显示为 `src/modules/` 和 `src/plugins/`。
- `component` 是所选目录下不带扩展名的相对页面路径，例如 `base/user/views/index`、`west/openAPI/views/app/index`。
- `base` 的每个页面入口统一为 `<子模块>/views/index.tsx`。`components`、`data`、`hooks` 等辅助目录不作为页面入口。
- 菜单表中的 `component` 必须使用当前真实入口；历史地址通过数据库迁移修正，路由层不维护地址别名。`componentSuffix` 不参与前端文件查找，菜单数据不再保存该字段。
- 菜单编辑校验与动态页面加载共用视图解析器。新增页面后应确认对应组件能在所选目录中解析，再保存菜单。
