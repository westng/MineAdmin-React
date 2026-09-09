import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MaFormItem, MaFormRenderContext } from '@/components/ma-form'
import type { UserPolicy, UserVo } from '../../api/user'

export interface UserForm extends Partial<UserVo> {
  password?: string
  department?: number[]
  position?: number[]
  policy?: UserPolicy
  policy_func?: string
}

export interface UserFormOptions {
  departments?: Array<{ id: number; name: string }>
  positions?: Array<{ id: number; dept_id?: number; name: string }>
}

export const emptyForm: UserForm = {
  username: '',
  nickname: '',
  password: '123456',
  phone: '',
  email: '',
  user_type: 100,
  status: 1,
  remark: '',
  backend_setting: [],
  department: [],
  position: [],
  policy: { policy_type: 'SELF', is_default: true, value: [] },
}

function renderMultiSelect({ item, value, setValue }: MaFormRenderContext<UserForm>) {
  const options = (item.renderProps?.options ?? []) as Array<{ id: number; name: string }>
  const selected = Array.isArray(value) ? value.map(Number) : []
  const toggle = (id: number, checked: boolean) => {
    setValue(checked ? Array.from(new Set([...selected, id])) : selected.filter(value => value !== id))
  }

  return (
    <div className="grid max-h-32 gap-2 overflow-y-auto rounded-md border p-2">
      {options.length === 0 && <span className="text-sm text-muted-foreground">暂无可选项</span>}
      {options.map(option => (
        <label key={option.id} className="flex items-center gap-2 text-sm">
          <Checkbox checked={selected.includes(option.id)} onCheckedChange={checked => toggle(option.id, checked === true)} />
          <span>{option.name}</span>
        </label>
      ))}
    </div>
  )
}

function renderStatusField({ item, value, setValue }: MaFormRenderContext<UserForm>) {
  const disabled = Boolean(item.renderProps?.disabled)

  return (
    <Select value={value == null ? '' : String(value)} onValueChange={nextValue => setValue(nextValue ? Number(nextValue) as 1 | 2 : undefined)} disabled={disabled}>
      <SelectTrigger className="w-full"><SelectValue placeholder="请选择状态" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="1">启用</SelectItem>
        <SelectItem value="2">禁用</SelectItem>
      </SelectContent>
    </Select>
  )
}

function renderSection(title: string, description: string) {
  return () => (
    <div className="border-b pb-2 pt-3 first:pt-0">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
    </div>
  )
}

export function getFormItems(isEditing = false, formOptions: UserFormOptions = {}): MaFormItem<UserForm>[] {
  const departments = formOptions.departments ?? []
  const positions = formOptions.positions ?? []
  const items: MaFormItem<UserForm>[] = [
    { render: renderSection('基础信息', '设置账号登录和联系方式'), showLabel: false, cols: { span: 24 } },
    {
      label: '用户名',
      prop: 'username',
      render: 'Input',
      renderProps: { placeholder: '请输入用户名' },
      itemProps: { rules: { required: true, message: '请输入用户名' } },
    },
    {
      label: '昵称',
      prop: 'nickname',
      render: 'Input',
      renderProps: { placeholder: '请输入昵称' },
      itemProps: { rules: { required: true, message: '请输入昵称' } },
    },
    {
      label: '密码',
      prop: 'password',
      render: 'Password',
      renderProps: { placeholder: isEditing ? '编辑时不修改密码' : '请输入初始密码', disabled: isEditing },
    },
    { label: '手机号', prop: 'phone', render: 'Input', renderProps: { placeholder: '请输入手机号' } },
    { label: '邮箱', prop: 'email', render: 'Input', renderProps: { type: 'email', placeholder: '请输入邮箱' } },
    { label: '状态', prop: 'status', render: renderStatusField },
    { render: renderSection('组织归属', '选择用户所属的部门和岗位'), showLabel: false, cols: { span: 24 } },
    { label: '部门', prop: 'department', render: renderMultiSelect, renderProps: { options: departments } },
    { label: '岗位', prop: 'position', render: renderMultiSelect, renderProps: { options: positions } },
    { render: renderSection('数据权限', '控制用户可查看和操作的数据范围'), showLabel: false, cols: { span: 24 } },
    {
      label: '数据权限',
      prop: 'policy.policy_type',
      render: 'Select',
      renderProps: {
        placeholder: '请选择数据权限',
        options: [
          { label: '全部数据', value: 'ALL' },
          { label: '本部门数据', value: 'DEPT_SELF' },
          { label: '本部门及以下', value: 'DEPT_TREE' },
          { label: '仅本人数据', value: 'SELF' },
          { label: '自定义部门', value: 'CUSTOM_DEPT' },
          { label: '自定义条件', value: 'CUSTOM_FUNC' },
        ],
      },
    },
    {
      label: '自定义部门',
      prop: 'policy.value',
      render: renderMultiSelect,
      renderProps: { options: departments },
      show: (_item, model) => model.policy?.policy_type === 'CUSTOM_DEPT',
    },
    {
      label: '自定义函数',
      prop: 'policy_func',
      render: 'Input',
      renderProps: { placeholder: '请输入数据权限函数名' },
      show: (_item, model) => model.policy?.policy_type === 'CUSTOM_FUNC',
    },
    { render: renderSection('补充信息', '记录便于识别和协作的备注'), showLabel: false, cols: { span: 24 } },
    { label: '备注', prop: 'remark', render: 'Textarea', renderProps: { placeholder: '请输入备注', rows: 3 }, cols: { span: 24 } },
  ]
  return items.map(item => item.cols ? item : { ...item, cols: { span: 12 } })
}
