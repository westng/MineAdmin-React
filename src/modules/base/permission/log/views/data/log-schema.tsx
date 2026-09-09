import type { MaProTableColumns } from '@/components/ma-pro-table'
import type { MaSearchItem } from '@/components/ma-search'
import type { UserLoginLogVo, UserOperationLogVo } from '../../api/log'
import { LoginStatus, LogText } from '../../components/LogRecordFields'

const timeSearchItems = [
  { prop: 'start_time', label: '开始时间', render: 'Input', renderProps: { type: 'datetime-local', step: 1 } },
  { prop: 'end_time', label: '结束时间', render: 'Input', renderProps: { type: 'datetime-local', step: 1 } },
] satisfies MaSearchItem[]

export const loginSearchItems: MaSearchItem<UserLoginLogVo>[] = [
  { prop: 'username', label: '用户名', render: 'Input', renderProps: { placeholder: '完整用户名' } },
  { prop: 'ip', label: '登录 IP', render: 'Input', renderProps: { placeholder: '完整 IP 地址' } },
  { prop: 'status', label: '登录状态', render: 'Select', renderProps: { options: [
    { label: '全部状态', value: '' }, { label: '成功', value: '1' }, { label: '失败', value: '2' },
  ] } },
  { prop: 'os', label: '操作系统', render: 'Input', renderProps: { placeholder: '完整系统名称' } },
  { prop: 'browser', label: '浏览器', render: 'Input', renderProps: { placeholder: '完整浏览器名称' } },
  ...timeSearchItems,
]

export const operationSearchItems: MaSearchItem<UserOperationLogVo>[] = [
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

export const loginColumns: MaProTableColumns<UserLoginLogVo>[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'username', label: '用户名', width: 140, cellRender: ({ row }) => <LogText value={row.username} /> },
  { prop: 'status', label: '登录状态', width: 100, cellRender: ({ row }) => <LoginStatus status={row.status} /> },
  { prop: 'ip', label: '登录 IP', width: 160, cellRender: ({ row }) => <LogText value={row.ip} /> },
  { prop: 'os', label: '操作系统', width: 140, cellRender: ({ row }) => <LogText value={row.os} /> },
  { prop: 'browser', label: '浏览器', width: 150, cellRender: ({ row }) => <LogText value={row.browser} /> },
  { prop: 'message', label: '提示消息', width: 180, cellRender: ({ row }) => <LogText value={row.message} /> },
  { prop: 'login_time', label: '登录时间', width: 190, cellRender: ({ row }) => <LogText value={row.login_time} /> },
]

export const operationColumns: MaProTableColumns<UserOperationLogVo>[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'username', label: '用户名', width: 140, cellRender: ({ row }) => <LogText value={row.username} /> },
  { prop: 'service_name', label: '业务名称', width: 180, cellRender: ({ row }) => <LogText value={row.service_name} /> },
  { prop: 'method', label: '请求方式', width: 110, cellRender: ({ row }) => <LogText value={row.method} /> },
  { prop: 'router', label: '请求路由', width: 260, cellRender: ({ row }) => <LogText value={row.router} /> },
  { prop: 'ip', label: '请求 IP', width: 160, cellRender: ({ row }) => <LogText value={row.ip} /> },
  { prop: 'created_at', label: '操作时间', width: 190, cellRender: ({ row }) => <LogText value={row.created_at} /> },
]
