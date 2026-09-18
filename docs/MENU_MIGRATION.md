# 菜单组件标识迁移

后端菜单的 component 字段仅可使用构建期 Manifest 中的稳定 ID 或显式兼容别名。下表的旧路径继续有效，删除前必须核对实际菜单数据与消费者；前端升级不会自动修改数据库。

| 旧别名 | 兼容视图路径 | 稳定 ID |
| --- | --- | --- |
| base/views/login/index | base/auth/views/index | base/auth |
| base/views/dashboard/index | base/dashboard/views/index | base/dashboard |
| base/views/clinic/index | base/clinic/views/index | base/clinic |
| base/views/dynamic-menu/index | base/dynamic-menu/views/index | base/dynamic-menu |
| base/views/user-center/index | base/user-center/views/index | base/user-center |
| base/views/account-settings/index | base/account-settings/views/index | base/account-settings |
| base/views/settings/index | base/settings/views/index | base/settings |
| base/views/permission/department/index | base/permission/department/views/index | base/permission/department |
| base/views/permission/menu/index | base/permission/menu/views/index | base/permission/menu |
| base/views/permission/role/index | base/permission/role/views/index | base/permission/role |
| base/views/permission/user/index | base/permission/user/views/index | base/permission/user |
| base/views/log/userLogin | base/permission/log/views/userLogin | base/permission/log/userLogin |
| base/views/log/userOperation | base/permission/log/views/userOperation | base/permission/log/userOperation |
| base/views/dataCenter/attachment/index | base/data-center/attachment/views/index | base/data-center/attachment |

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
