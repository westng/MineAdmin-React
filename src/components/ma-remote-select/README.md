# MaRemoteSelect

远程下拉选择器。应用已在 `AppProviders` 中绑定项目 HTTP 客户端，普通场景只需要传入 `url`。

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

组件默认使用 `GET`，搜索参数为 `keywords`，分页参数为 `page` 和 `page_size`，默认页大小为 20。标准响应支持 `data.items`、`data.list` 或数组，并根据 `total`、`hasMore`、`has_more` 判断是否还有下一页。

编辑表单有初始值时，组件默认使用同一接口并传递 `ids` 参数回显选项；接口使用其他回显参数时，可以配置 `echo`：

```tsx
<MaRemoteSelect
  url="/admin/user/options"
  echo={{ valueParam: 'id' }}
/>
```

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
