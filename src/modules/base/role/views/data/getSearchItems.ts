import type { MaSearchItem } from '@/components/ma-search'
import type { TextTranslator } from '@/services/i18n/translator'
import type { RoleVo } from '../../api/role'

export const emptySearch = { name: '', code: '', status: '' }

export function getSearchItems(tx: TextTranslator): MaSearchItem<RoleVo>[] {
  return [
    { prop: 'name', label: tx('角色名称'), render: 'Input' },
    { prop: 'code', label: tx('角色编码'), render: 'Input' },
    {
      prop: 'status',
      label: tx('状态'),
      render: 'Select',
      renderProps: {
        options: [
          { label: tx('启用'), value: '1' },
          { label: tx('禁用'), value: '2' },
        ],
      },
    },
  ]
}

export function toRoleQueryParams(params: Record<string, unknown>) {
  return {
    ...params,
    name: typeof params.name === 'string' ? params.name.trim() : undefined,
    code: typeof params.code === 'string' ? params.code.trim() : undefined,
    status: params.status ? Number(params.status) : undefined,
  }
}
