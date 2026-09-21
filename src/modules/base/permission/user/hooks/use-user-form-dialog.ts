import { useEffect, useState } from 'react'
import { useMaFormDialog } from '@/components/ma-dialog'
import { hasAuth } from '@/hooks/framework/use-permission'
import { useMessage } from '@/hooks/framework/use-message'
import { page as pageDepartments, type DepartmentVo } from '@/modules/base/permission/department/api/department'
import { page as pagePositions } from '@/modules/base/permission/department/api/position'
import { createTextTranslator } from '@/provider/i18n'
import { extractList } from '@/utils/api-data'
import { createUser, saveUser, type UserVo } from '../api/user'
import { getFormItems, type DepartmentOption, type UserForm } from '../views/data'
import { assertUserResponse, toUserForm, toUserPayload } from '../views/data/form-values'

const tx = createTextTranslator('base.permission.user.ui')

export function useUserFormDialog(onSaved: () => Promise<void>) {
  const message = useMessage()
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [positions, setPositions] = useState<Array<{ id: number; dept_id?: number; name: string }>>([])
  useEffect(() => {
    let active = true
    const normalize = (items: DepartmentVo[]): DepartmentOption[] =>
      items.flatMap(item =>
        item.id && item.name ? [{ id: item.id, name: item.name, children: normalize(item.children ?? []) }] : [],
      )
    void Promise.all([pageDepartments({}), pagePositions({ page: 1, page_size: 500 })])
      .then(([departmentResponse, positionResponse]) => {
        if (!active) return
        setDepartments(normalize(extractList<DepartmentVo>(departmentResponse.data.data)))
        setPositions(
          extractList<{ id?: number; dept_id?: number; name?: string }>(positionResponse.data.data).flatMap(item =>
            item.id && item.name ? [{ id: item.id, dept_id: item.dept_id, name: item.name }] : [],
          ),
        )
      })
      .catch(() => {
        /* 缺少组织查询权限时，仍可编辑其他用户字段。 */
      })
    return () => {
      active = false
    }
  }, [])

  const editor = useMaFormDialog<UserForm, UserVo | null>({
    defaultValues: () => toUserForm(null),
    toValues: toUserForm,
    canSubmit: user => hasAuth(user?.id ? 'permission:user:update' : 'permission:user:save'),
    formOptions: { layout: 'grid', grid: { columns: 2, gap: '1.25rem' }, containerClass: 'pb-1' },
    onSubmit: async (values, user) => {
      const payload = toUserPayload(values)
      assertUserResponse(user?.id ? await saveUser(user.id, payload) : await createUser(payload))
    },
    onSuccess: async (_values, user) => {
      message.success(user?.id ? tx('用户更新成功') : tx('用户创建成功'))
      await onSaved()
    },
    onError: error => message.error(error instanceof Error ? error.message : tx('用户保存失败')),
  })
  return { ...editor, items: getFormItems(Boolean(editor.data?.id), { departments, positions }) }
}
