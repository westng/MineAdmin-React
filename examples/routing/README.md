# 四类路由的最小示例

1. 使用框架自带 `/dashboard` 验证默认静态页面；没有安装插件时也应正常显示。
2. 将 `module/` 的内容复制到 `src/modules/example/report/`。
3. 将 `plugin/` 的内容复制到 `src/plugins/example/report/`，保留默认导出的启用配置。
4. 在测试后台按 `menus.json` 配置两条菜单并授予测试用户，重新加载菜单。

访问 `/examples/module`、`/examples/plugin` 和 `/examples/help`，分别看到“模块动态页面”“插件动态页面”“插件静态页面”。两个动态菜单的视图地址相同，通过 `meta.componentPath` 选择不同目录。帮助页只在插件 `views` 声明，不需要后台菜单。

自动化测试 `tests/framework-public-routing.test.mjs` 会在临时公开源码副本中完成同样安装，使用模拟菜单和会话，不访问真实后台。

完整约定见 [路由文档](../../docs/ROUTING.md)。
