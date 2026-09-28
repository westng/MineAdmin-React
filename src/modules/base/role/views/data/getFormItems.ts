import type { MaFormItem } from '@/components/ma-form'
import type { TextTranslator } from '@/services/i18n/translator'
import type { RoleVo } from '../../api/role'

export type RoleForm = RoleVo & { name: string; code: string; status: number; sort: number; remark: string }

export function toRoleForm(role: RoleVo | null): RoleForm {
  return {
    ...role,
    name: role?.name ?? '',
    code: role?.code ?? '',
    status: role?.status ?? 1,
    sort: role?.sort ?? 0,
    remark: role?.remark ?? '',
  }
}

export function getFormItems(tx: TextTranslator, editing: boolean): MaFormItem<RoleForm>[] {
  const items: MaFormItem<RoleForm>[] = [
    {
      prop: 'name',
      label: tx('角色名称'),
      render: 'Input',
      itemProps: { rules: { required: true, pattern: /\S/, message: tx('角色名称和编码不能为空') } },
    },
    {
      prop: 'code',
      label: tx('角色编码'),
      render: 'Input',
      renderProps: { disabled: editing },
      itemProps: { rules: { required: true, pattern: /\S/, message: tx('角色名称和编码不能为空') } },
    },
    { prop: 'sort', label: tx('排序'), render: 'InputNumber' },
    {
      prop: 'status',
      label: tx('状态'),
      render: 'Select',
      renderProps: {
        options: [
          { label: tx('启用'), value: 1 },
          { label: tx('禁用'), value: 2 },
        ],
      },
    },
    { prop: 'remark', label: tx('备注'), render: 'Textarea', cols: { span: 24 } },
  ]
  return items.map(item => ({ cols: { span: 12 }, ...item }))
}
