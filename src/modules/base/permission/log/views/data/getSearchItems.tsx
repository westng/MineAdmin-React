import type { MaSearchItem } from '@/components/ma-search'
import type { UserLoginLogVo, UserOperationLogVo } from '../../api/log'

const timeSearchItems = [
  { prop: 'start_time', label: '开始时间', render: 'Input', renderProps: { type: 'datetime-local', step: 1 } },
  { prop: 'end_time', label: '结束时间', render: 'Input', renderProps: { type: 'datetime-local', step: 1 } },
] satisfies MaSearchItem[]

export function getLoginSearchItems(): MaSearchItem<UserLoginLogVo>[] {
  return [
    { prop: 'username', label: '用户名', render: 'Input', renderProps: { placeholder: '完整用户名' } },
    { prop: 'ip', label: '登录 IP', render: 'Input', renderProps: { placeholder: '完整 IP 地址' } },
    { prop: 'status', label: '登录状态', render: 'Select', renderProps: { options: [
      { label: '全部状态', value: '' }, { label: '成功', value: '1' }, { label: '失败', value: '2' },
    ] } },
    { prop: 'os', label: '操作系统', render: 'Input', renderProps: { placeholder: '完整系统名称' } },
    { prop: 'browser', label: '浏览器', render: 'Input', renderProps: { placeholder: '完整浏览器名称' } },
    ...timeSearchItems,
  ]
}

export function getOperationSearchItems(): MaSearchItem<UserOperationLogVo>[] {
  return [
    { prop: 'username', label: '用户名', render: 'Input', renderProps: { placeholder: '完整用户名' } },
    { prop: 'service_name', label: '业务名称', render: 'Input', renderProps: { placeholder: '完整业务名称' } },
    { prop: 'method', label: '请求方式', render: 'Select', renderProps: { options: [
      { label: '全部方式', value: '' },
      ...['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(value => ({ label: value, value })),
    ] } },
    { prop: 'router', label: '请求路由', render: 'Input', renderProps: { placeholder: '完整请求路径' } },
    { prop: 'ip', label: '请求 IP', render: 'Input', renderProps: { placeholder: '完整 IP 地址' } },
    ...timeSearchItems,
  ]
}
