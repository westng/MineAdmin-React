import { createTextTranslator } from '@/provider/i18n'
import type { MaSearchItem } from '@/components/ma-search'
import type { UserLoginLogVo, UserOperationLogVo } from '../../api/log'

const tx = createTextTranslator('base.permission.log.ui')

const timeSearchItems = [
  {
    prop: 'start_time',
    get label() {
      return tx('开始时间')
    },
    render: 'Input',
    renderProps: { type: 'datetime-local', step: 1 },
  },
  {
    prop: 'end_time',
    get label() {
      return tx('结束时间')
    },
    render: 'Input',
    renderProps: { type: 'datetime-local', step: 1 },
  },
] satisfies MaSearchItem[]

export function getLoginSearchItems(): MaSearchItem<UserLoginLogVo>[] {
  return [
    { prop: 'username', label: tx('用户名'), render: 'Input', renderProps: { placeholder: tx('完整用户名') } },
    { prop: 'ip', label: tx('登录 IP'), render: 'Input', renderProps: { placeholder: tx('完整 IP 地址') } },
    {
      prop: 'status',
      label: tx('登录状态'),
      render: 'Select',
      renderProps: {
        options: [
          { label: tx('全部状态'), value: '' },
          { label: tx('成功'), value: '1' },
          { label: tx('失败'), value: '2' },
        ],
      },
    },
    { prop: 'os', label: tx('操作系统'), render: 'Input', renderProps: { placeholder: tx('完整系统名称') } },
    { prop: 'browser', label: tx('浏览器'), render: 'Input', renderProps: { placeholder: tx('完整浏览器名称') } },
    ...timeSearchItems,
  ]
}

export function getOperationSearchItems(): MaSearchItem<UserOperationLogVo>[] {
  return [
    { prop: 'username', label: tx('用户名'), render: 'Input', renderProps: { placeholder: tx('完整用户名') } },
    { prop: 'service_name', label: tx('业务名称'), render: 'Input', renderProps: { placeholder: tx('完整业务名称') } },
    {
      prop: 'method',
      label: tx('请求方式'),
      render: 'Select',
      renderProps: {
        options: [
          { label: tx('全部方式'), value: '' },
          ...['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(value => ({ label: value, value })),
        ],
      },
    },
    { prop: 'router', label: tx('请求路由'), render: 'Input', renderProps: { placeholder: tx('完整请求路径') } },
    { prop: 'ip', label: tx('请求 IP'), render: 'Input', renderProps: { placeholder: tx('完整 IP 地址') } },
    ...timeSearchItems,
  ]
}
