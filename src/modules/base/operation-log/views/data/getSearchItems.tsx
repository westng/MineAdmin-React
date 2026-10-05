import { createTextTranslator } from '@/services/i18n/translator'
import { MaDateRangePickerField } from '@/components/ma-date-range-picker'
import type { MaSearchItem } from '@/components/ma-search'
import type { UserLoginLogVo, UserOperationLogVo } from '../../api/log'
import type { AppRuntime } from '@/provider/runtime/types'
export function createViewData(runtime: Pick<AppRuntime, 'i18n' | 'locales'>) {
  const tx = createTextTranslator(runtime, 'base.permission.log.ui')
  const rangePickerProps = {
    valueFormat: 'yyyy-MM-dd HH:mm:ss',
    displayFormat: 'yyyy-MM-dd HH:mm:ss',
  }
  function getLoginSearchItems(): MaSearchItem<UserLoginLogVo>[] {
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
      { prop: 'login_time', label: tx('登录时间'), component: MaDateRangePickerField, renderProps: rangePickerProps },
    ]
  }
  function getOperationSearchItems(): MaSearchItem<UserOperationLogVo>[] {
    return [
      { prop: 'username', label: tx('用户名'), render: 'Input', renderProps: { placeholder: tx('完整用户名') } },
      {
        prop: 'service_name',
        label: tx('业务名称'),
        render: 'Input',
        renderProps: { placeholder: tx('完整业务名称') },
      },
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
      { prop: 'created_at', label: tx('操作时间'), component: MaDateRangePickerField, renderProps: rangePickerProps },
    ]
  }
  return { getLoginSearchItems, getOperationSearchItems }
}
