import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Cascader,
  CascaderChips,
  CascaderContent,
  CascaderEmpty,
  CascaderList,
  CascaderPanel,
  CascaderStatus,
  useCascaderAnchor,
} from '@/components/reui/cascader/cascader'
import { CascaderInput, CascaderNav } from '@/components/reui/cascader/cascader-nav'
import { CascaderItems } from '@/components/reui/cascader/cascader-item'
import type { CascaderNode } from '@/components/reui/cascader/cascader-types'
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
  departments?: DepartmentOption[]
  positions?: Array<{ id: number; dept_id?: number; name: string }>
}

export interface DepartmentOption {
  id: number
  name: string
  children?: DepartmentOption[]
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

function DepartmentTreeSelect({ value, setValue, item }: MaFormRenderContext<UserForm>) {
  const anchor = useCascaderAnchor()
  const options = (item.renderProps?.options ?? []) as DepartmentOption[]
  const toNode = (option: DepartmentOption): CascaderNode => ({
    value: String(option.id),
    label: option.name,
    children: option.children?.map(toNode),
  })
  const items: CascaderNode[] = options.map(toNode)
  const selected = Array.isArray(value) ? value.map(String) : []

  return (
    <Cascader
      multiple
      mode="tree"
      items={items}
      selectable="any"
      value={selected}
      onValueChange={values => setValue(values.map(Number))}
      searchScope="deep"
      maxHeight={240}
    >
      <CascaderChips ref={anchor} placeholder="请选择部门" className="w-full" />
      <CascaderContent anchor={anchor} className="min-w-[min(24rem,calc(100vw-2rem))]">
        <CascaderPanel>
          <CascaderNav>
            <CascaderInput placeholder="搜索部门" />
          </CascaderNav>
          <CascaderEmpty>暂无可选部门</CascaderEmpty>
          <CascaderList><CascaderItems /></CascaderList>
          <CascaderStatus />
        </CascaderPanel>
      </CascaderContent>
    </Cascader>
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

export function getFormItems(isEditing = false, formOptions: UserFormOptions = {}): MaFormItem<UserForm>[] {
  const departments = formOptions.departments ?? []
  const positions = formOptions.positions ?? []
  const items: MaFormItem<UserForm>[] = [
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
    { label: '部门', prop: 'department', render: DepartmentTreeSelect, renderProps: { options: departments } },
    { label: '岗位', prop: 'position', render: renderMultiSelect, renderProps: { options: positions } },
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
      render: DepartmentTreeSelect,
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
    { label: '备注', prop: 'remark', render: 'Textarea', renderProps: { placeholder: '请输入备注', rows: 3 }, cols: { span: 24 } },
  ]
  return items.map(item => item.cols ? item : { ...item, cols: { span: 12 } })
}
