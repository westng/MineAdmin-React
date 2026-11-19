import type { MaFormItem } from '@/components/ma-form'
import type { TextTranslator } from '@/services/i18n/translator'
import type { DepartmentVo } from '../../api/department'
import type { PositionVo } from '../../api/position'

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

export type PositionForm = { name: string }

export function getPositionFormItems(tx: TextTranslator): MaFormItem<PositionForm>[] {
  return [
    {
      prop: 'name',
      label: tx('岗位名称'),
      render: 'Input',
      renderProps: { maxLength: 50, placeholder: tx('请输入岗位名称') },
      itemProps: {
        rules: {
          required: true,
          max: 50,
          pattern: /\S/,
          message: tx('岗位名称不能为空，且不能超过 50 个字符'),
        },
      },
    },
  ]
}

export function toPositionForm(position: PositionVo | null): PositionForm {
  return { name: position?.name ?? '' }
}
export function toPositionPayload(values: PositionForm, departmentId: number) {
  return { dept_id: departmentId, name: values.name.trim() }
}
