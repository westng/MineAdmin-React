# 导航与菜单迁移

本文说明后端菜单如何进入 React 路由、Sidebar 和 Breadcrumb，并记录组件标识迁移规则。前端不会自动修改后端菜单数据；修改菜单前先备份目标环境数据，并使用合法账号验证权限。

## 菜单响应与路径

菜单由 `/admin/permission/menus` 返回，前端会校验并过滤状态、隐藏和访问条件。常用字段如下：

| 字段                                 | 作用                                              |
| ------------------------------------ | ------------------------------------------------- |
| `name` / `meta.title`                | 菜单显示名称，`meta.i18n` 可提供翻译 key          |
| `path` 或 `route`                    | 菜单 URL；子菜单支持相对父级路径                  |
| `component`                          | Route Manifest 的稳定 ID 或显式兼容别名           |
| `children`                           | 子菜单数组，决定 Sidebar 分组和 Breadcrumb 祖先链 |
| `meta.hidden`、`is_hidden`、`status` | 控制菜单是否参与可见导航                          |
| `meta.permission`、`role`、`user`    | 前端可见性判断；后端仍必须执行授权                |

路径匹配使用当前地址与菜单树的最长匹配项。它支持绝对路径、相对父级路径和嵌套菜单；未命中时进入统一动态菜单回退页。不要在页面组件里重新拼接菜单路径。

## 页面壳层导航

当前页面结构由一个 `SidebarProvider` 承载：

```text
#app
└── SidebarProvider
    ├── Header
    │   ├── Logo
    │   └── Breadcrumb
    └── Sidebar + SidebarInset
```

- Header 使用 ReUI Breadcrumb 原语，父级菜单渲染为可点击链接，当前菜单渲染为当前页节点。
- Logo 使用 `src/assets/images/logo.svg`，导航中不重复显示完整品牌标题。
- Sidebar 展开宽度使用 `--sidebar-width`，折叠宽度使用 `--sidebar-width-icon`。
- 折叠按钮固定在 Sidebar 右缘中线，使用 `data-slot="sidebar-rail"`，支持鼠标和键盘焦点。
- 页面与菜单滚动区域不使用 `overscroll-none` 禁止浏览器或触控板边界回弹。

相关实现：

- `src/layouts/index.tsx`
- `src/layouts/components/header/index.tsx`
- `src/layouts/components/main-aside/index.tsx`
- `src/components/reui/primitives/sidebar.tsx`
- `src/components/reui/primitives/breadcrumb.tsx`
- `src/router/dynamic-menu.ts`

后端菜单的 component 字段仅可使用构建期 Manifest 中的稳定 ID 或显式兼容别名。下表的旧路径继续有效，删除前必须核对实际菜单数据与消费者；前端升级不会自动修改数据库。

| 旧别名                                 | 兼容视图路径                            | 稳定 ID                           |
| -------------------------------------- | --------------------------------------- | --------------------------------- |
| base/views/login/index                 | base/auth/views/index                   | base/auth                         |
| base/views/dashboard/index             | base/dashboard/views/index              | base/dashboard                    |
| base/views/clinic/index                | base/clinic/views/index                 | base/clinic                       |
| base/views/dynamic-menu/index          | base/dynamic-menu/views/index           | base/dynamic-menu                 |
| base/views/user-center/index           | base/user-center/views/index            | base/user-center                  |
| base/views/account-settings/index      | base/account-settings/views/index       | base/account-settings             |
| base/views/settings/index              | base/settings/views/index               | base/settings                     |
| base/views/permission/department/index | base/permission/department/views/index  | base/permission/department        |
| base/views/permission/menu/index       | base/permission/menu/views/index        | base/permission/menu              |
| base/views/permission/role/index       | base/permission/role/views/index        | base/permission/role              |
| base/views/permission/user/index       | base/permission/user/views/index        | base/permission/user              |
| base/views/log/userLogin               | base/permission/log/views/userLogin     | base/permission/log/userLogin     |
| base/views/log/userOperation           | base/permission/log/views/userOperation | base/permission/log/userOperation |
| base/views/dataCenter/attachment/index | base/data-center/attachment/views/index | base/data-center/attachment       |

支持省略或保留 .tsx 后缀。其他旧路径必须由应用适配器逐个声明，不能恢复后缀猜测或任意路径 import。

## 退出流程

1. 备份目标环境菜单数据，按 component 聚合核对旧标识使用量，确认组件与权限没有语义变化。
2. 通过项目现有菜单管理或经过审核的数据迁移，分批改为稳定 ID；保留 URL、name、权限码和父子关系。
3. 验证刷新、深链接、权限拒绝、菜单更新及回滚。前端兼容别名至少保留一个迁移周期。
4. 所有受支持环境均无旧标识后，在版本说明中宣布移除，删除对应 alias 与测试旧分支。

只读核对示例（具体表前缀以部署为准）：

```sql
SELECT component, COUNT(*) AS usage_count
FROM menu
WHERE component LIKE 'base/%'
GROUP BY component;
```

本文件没有执行迁移，也不授权直接修改运行中环境。未知组件显示明确回退页，不能静默映射到其他模块。

## 联调检查

在后端可用并使用合法账号登录后，至少检查：

1. `/dashboard` 能正常加载，首页菜单和 Breadcrumb 显示正确。
2. 有父级菜单的子页面显示完整 Breadcrumb；父级可点击，当前页高亮。
3. Sidebar 展开、折叠后，内容区宽度、折叠按钮和当前项状态同步变化。
4. 直接刷新子页面深链接，菜单、权限门禁和页面内容保持一致。
5. 在菜单顶部和底部用触控板继续拖动，保留浏览器默认边界回弹。
6. 无权限地址显示拒绝页或回退页，不能仅依赖隐藏菜单保护接口。

排查时优先查看 `/admin/permission/menus` 的脱敏响应、路由 Manifest 和 `src/router/dynamic-menu.ts`。不要提交账号、Cookie、Token 或真实业务数据。
