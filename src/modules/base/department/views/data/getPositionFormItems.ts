import type { MaFormItem } from '@/components/ma-form'
import type { TextTranslator } from '@/services/i18n/translator'

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
