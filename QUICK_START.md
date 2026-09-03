# 🚀 快速测试指南

## 启动项目

### 1. 启动后端（在项目根目录）
```bash
# 如果后端还没启动
php bin/hyperf.php start
```
后端会运行在 `http://127.0.0.1:9601`

### 2. 启动前端（在 web 目录）
```bash
cd web
pnpm install
pnpm run dev
```
前端会运行在 `http://localhost:2777`

---

## 测试菜单修复

### ✅ 测试检查清单

访问 http://localhost:2777 并登录（admin / 123456）后，检查：

#### 1. **左侧导航栏（图标栏）**
- [ ] **不应该**看到 `/permission` 文字或图标
- [ ] 应该只看到具体的功能图标（用户管理、角色管理等）
- [ ] 每个图标都有对应的 tooltip 提示

#### 2. **点击任意菜单图标**
- [ ] 右侧面板应该显示子菜单列表
- [ ] 面板顶部显示正确的中文标题（如 "权限管理"）
- [ ] 子菜单项可以点击导航

#### 3. **导航到子页面**（如 `/permission/user`）
- [ ] 左侧对应的父菜单图标高亮
- [ ] 右侧面板显示所有同级子菜单
- [ ] 当前页面在子菜单列表中高亮

#### 4. **样式检查**
- [ ] 布局正常，无错位
- [ ] 文字清晰可读
- [ ] 图标大小一致
- [ ] hover 和 active 状态正常

---

## 🐛 如果仍有问题

### 打开浏览器控制台（F12）

查看控制台输出，应该看到类似：
```javascript
MainAside Debug: {
  pathname: "/permission/user",
  section: "dynamic:/permission",
  navigationTitle: "权限管理",
  navigationSectionItemsCount: 4,
  navigationSectionItems: [
    { label: "用户管理", to: "/permission/user" },
    { label: "角色管理", to: "/permission/role" },
    { label: "菜单管理", to: "/permission/menu" },
    { label: "部门管理", to: "/permission/department" }
  ],
  menusCount: 6
}
```

### 检查后端 API

在浏览器控制台的 Network 标签中：
1. 找到 `/admin/permission/menus` 请求
2. 查看响应数据
3. 确认数据结构正确

预期数据结构：
```json
{
  "code": 200,
  "message": "成功",
  "data": [
    {
      "id": 1,
      "name": "权限管理",
      "path": "/permission",
      "component": "Layout",
      "children": [
        {
          "id": 11,
          "name": "用户管理",
          "path": "/permission/user",
          "component": "permission/user"
        },
        ...
      ]
    }
  ]
}
```

---

## 💬 报告问题

如果仍有问题，请提供：
1. 截图（显示错误状态）
2. 控制台的 Debug 日志
3. `/admin/permission/menus` API 的返回数据
4. 具体的操作步骤

---

## 📚 相关文档

- [菜单修复详细说明](./MENU_FIX_SUMMARY.md)
- [项目 README](./README.md)
