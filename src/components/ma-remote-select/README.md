# MaRemoteSelect

远程下拉选择器。应用已在 `AppProviders` 中通过 `MaRemoteSelectProvider` 绑定当前 Runtime 的 HTTP 客户端，普通场景只需要传入 `url`。独立消费方应提供 `request` 或 `MaRemoteSelectProvider`；组件自身不创建应用 HTTP 单例。

```tsx
<MaRemoteSelect url="/admin/advertiser/options" />
```

常用配置：

```tsx
<MaRemoteSelect
  url="/admin/advertiser/options"
  params={{ platform: 'QC' }}
  fieldNames={{ value: 'id', label: 'name' }}
  multiple
/>
```

组件默认使用 `GET`，搜索参数为 `keywords`，分页参数为 `page` 和 `page_size`，默认页大小为 20，并默认支持清除；传入 `clearable: false` 可关闭。标准响应支持 `data.items`、`data.list` 或数组，并根据 `total`、`hasMore`、`has_more` 判断是否还有下一页。

编辑表单有初始值时，组件默认使用同一接口并传递 `ids` 参数回显选项；接口使用其他回显参数时，可以配置 `echo`：

```tsx
<MaRemoteSelect url="/admin/user/options" echo={{ valueParam: 'id' }} />
```

回显接口返回空或部分结果时，不会自动重复请求缺失的 ID；未找到的值保留原始值显示。请求失败后，通过下拉面板的“重试”重新发起失败的回显。回显和列表分页独立加载，列表刷新保留已选标签。

URL、请求方法、固定参数、请求体、回显配置、字段映射或请求/响应函数变化时，组件取消旧请求并重置选项、搜索和分页，再为当前已选值回显。`request` 和 `responseMap` 应使用稳定的函数引用；相同内容的 JSON 参数对象不会触发重置。

`MaForm` 可以把它作为自定义组件使用：

```tsx
{
  prop: 'advertiser_id',
  label: '广告主',
  component: MaRemoteSelect,
  renderProps: {
    url: '/admin/advertiser/options',
    params: { platform: 'QC' },
  },
}
```

非标准请求或响应结构使用 `request`、`responseMap` 作为单点扩展，不需要修改组件内部约定。
