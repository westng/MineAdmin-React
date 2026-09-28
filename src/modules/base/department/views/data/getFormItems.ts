import type { MaFormItem } from '@/components/ma-form'
import type { TextTranslator } from '@/services/i18n/translator'
import type { DepartmentVo } from '../../api/department'

export type DepartmentForm = { id?: number; name: string; parent_id: number }

export function toDepartmentForm(department: DepartmentVo | null): DepartmentForm {
  return { id: department?.id, name: department?.name ?? '', parent_id: department?.parent_id ?? 0 }
}

export function getFormItems(
  tx: TextTranslator,
  parents: Array<{ department: DepartmentVo; depth: number }>,
): MaFormItem<DepartmentForm>[] {
  return [
    {
      prop: 'name',
      label: tx('部门名称'),
      render: 'Input',
      renderProps: { placeholder: tx('例如：研发中心') },
      itemProps: { rules: { required: true, pattern: /\S/, message: tx('部门名称不能为空') } },
    },
    {
      prop: 'parent_id',
      label: tx('上级部门'),
      render: 'Select',
      renderProps: {
        options: [
          { value: 0, label: tx('顶级部门') },
          ...parents.flatMap(({ department, depth }) =>
            department.id ? [{ value: department.id, label: `${'　'.repeat(depth)}${department.name ?? ''}` }] : [],
          ),
        ],
      },
    },
  ]
}
