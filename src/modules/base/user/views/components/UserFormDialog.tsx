import { MaForm } from '@/components/ma-form'
import { useImperativeHandle, type Ref } from 'react'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createDepartmentApi } from '@/modules/base/department/api/department'
import { createApi as createPositionApi } from '@/modules/base/department/api/position'
import { createApi as createUserApi } from '@/modules/base/user/api/user'
import { useEffect, useState } from 'react'
import { MaDialog, useMaFormDialog } from '@/components/ma-dialog'
import { usePermission } from '@/hooks/auth/use-permission'
import { useMessage } from '@/hooks/ui/use-message'
import { type DepartmentVo } from '@/modules/base/department/api/department'

import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { extractList } from '@/utils/api-data'
import { type UserVo } from '../../api/user'
import { type DepartmentOption, type UserForm } from '../data/getFormItems'
import { createViewData as createFormItemsViewData } from '../data/getFormItems'
import { createViewData as createFormValuesViewData } from '../data/form-values'

export interface UserFormDialogHandle {
  open: (user: UserVo | null) => void
}

export function UserFormDialog({ ref, onSaved }: { ref?: Ref<UserFormDialogHandle>; onSaved: () => Promise<void> }) {
  const { getFormItems } = useRuntimeFactory(createFormItemsViewData)

  const { assertUserResponse, toUserForm, toUserPayload } = useRuntimeFactory(createFormValuesViewData)

  const tx = useTextTranslator('base.permission.user.ui')

  const { hasAuth } = usePermission()
  const { page: pageDepartments } = useRuntimeFactory(createDepartmentApi)
  const { page: pagePositions } = useRuntimeFactory(createPositionApi)
  const { createUser, saveUser } = useRuntimeFactory(createUserApi)

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
  }, [pageDepartments, pagePositions])

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
  const items = getFormItems(Boolean(editor.data?.id), { departments, positions })
  useImperativeHandle(ref, () => ({ open: editor.open }), [editor.open])
  return (
    <MaDialog
      {...editor.dialogProps}
      title={editor.data?.id ? tx('编辑用户') : tx('新增用户')}
      description={tx('填写用户基本信息、组织归属和数据权限，保存后立即生效。')}
      okText={tx('保存')}
      cancelText={tx('取消')}
      size="xl"
    >
      <MaForm key={editor.formKey} {...editor.formProps} items={items} />
    </MaDialog>
  )
}
