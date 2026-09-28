import { createTextTranslator } from '@/services/i18n/translator'
import type { UserVo } from '../../api/user'
import { type UserForm } from './getFormItems'
import { createViewData as createFormItemsViewData } from './getFormItems'
import type { AppRuntime } from '@/provider/runtime/types'
export function createViewData(runtime: Pick<AppRuntime, 'i18n' | 'locales'>) {
  const { emptyForm } = createFormItemsViewData(runtime)

  const tx = createTextTranslator(runtime, 'base.permission.user.ui')
  function toUserForm(user: UserVo | null): UserForm {
    if (!user) return structuredClone(emptyForm)
    return {
      ...user,
      password: '',
      backend_setting: Array.isArray(user.backend_setting) ? user.backend_setting : [],
      department: user.departments?.flatMap(item => (item.id ? [item.id] : [])) ?? [],
      position: user.positions?.flatMap(item => (item.id ? [item.id] : [])) ?? [],
      policy: user.policy
        ? { ...user.policy, value: Array.isArray(user.policy.value) ? user.policy.value : [] }
        : { policy_type: 'SELF', is_default: true, value: [] },
      policy_func: user.policy?.policy_type === 'CUSTOM_FUNC' ? String(user.policy.value?.[0] ?? '') : '',
    }
  }
  function toUserPayload(values: UserForm): UserForm {
    const policy = values.policy?.policy_type
      ? {
          ...values.policy,
          value:
            values.policy.policy_type === 'CUSTOM_FUNC'
              ? values.policy_func
                ? [values.policy_func]
                : []
              : Array.isArray(values.policy.value)
                ? values.policy.value
                : [],
        }
      : undefined
    const payload = {
      ...values,
      backend_setting: Array.isArray(values.backend_setting) ? values.backend_setting : [],
      department: Array.isArray(values.department) ? values.department : [],
      position: Array.isArray(values.position) ? values.position : [],
      policy,
    }
    delete payload.id
    delete payload.departments
    delete payload.positions
    delete payload.roles
    delete payload.policy_func
    return payload
  }
  function assertUserResponse(response: { data: { code: number; message?: string } }) {
    if (response.data.code !== 200) throw new Error(response.data.message || tx('操作失败'))
  }
  return { toUserForm, toUserPayload, assertUserResponse }
}
