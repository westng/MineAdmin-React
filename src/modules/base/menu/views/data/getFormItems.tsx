import { MaIconPicker } from '@/components/ma-icon-picker'
import type { MaFormItem } from '@/components/ma-form'
import type { TextTranslator } from '@/services/i18n/translator'
import type { ViewResolver } from '@/router/types'
import type { MenuVo } from '../../api/menu'
import { MenuCascader } from '../components/menu-cascader'
import type { MenuForm } from './menu-form'

export function getFormItems(
  tx: TextTranslator,
  form: MenuForm,
  menus: MenuVo[],
  views: ViewResolver,
): MaFormItem<MenuForm>[] {
  const isButton = form.type === 'B'
  const requiredMessage = isButton ? tx('按钮名称和权限编码不能为空') : tx('菜单名称、编码和菜单路由不能为空')
  const required = { required: true, pattern: /\S/, message: requiredMessage }
  const items: MaFormItem<MenuForm>[] = [
    {
      prop: 'title',
      label: isButton ? tx('按钮名称') : tx('菜单名称'),
      render: 'Input',
      renderProps: { id: 'menu-title', placeholder: isButton ? tx('例如：查看用户') : tx('例如：用户管理') },
      itemProps: { rules: required },
    },
    {
      prop: 'name',
      label: isButton ? tx('权限编码') : tx('菜单编码'),
      render: 'Input',
      renderProps: { id: 'menu-name', placeholder: isButton ? 'permission:user:index' : 'permission:user' },
      itemProps: { rules: required },
    },
    {
      prop: 'parent_id',
      label: tx('父级菜单'),
      render: ({ value, setValue }) => (
        <MenuCascader
          menus={menus}
          value={value == null ? undefined : Number(value)}
          onChange={setValue}
          excludeId={form.id}
        />
      ),
    },
    {
      prop: 'type',
      label: tx('菜单类型'),
      render: 'Select',
      renderProps: {
        options: [
          { value: 'M', label: tx('菜单（M）') },
          { value: 'L', label: tx('外链（L）') },
          { value: 'I', label: tx('内嵌（I）') },
          { value: 'B', label: tx('按钮（B）') },
        ],
      },
    },
    {
      prop: 'path',
      label: tx('路由地址'),
      render: 'Input',
      renderProps: { placeholder: '/permission/user' },
      show: (_item, values) => values.type !== 'B',
      itemProps: { rules: required },
    },
    {
      prop: 'componentPath',
      label: tx('组件目录'),
      render: 'Select',
      show: (_item, values) => values.type === 'M',
      renderProps: {
        options: [
          { value: 'modules/', label: 'src/modules/' },
          { value: 'plugins/', label: 'src/plugins/' },
        ],
      },
    },
    {
      prop: 'component',
      label: tx('组件路径'),
      render: 'Input',
      show: (_item, values) => values.type === 'M',
      renderProps: {
        placeholder: form.componentPath === 'plugins/' ? 'mine-admin/dictionary/views/index' : 'base/user/views/index',
      },
      itemProps: {
        rules: {
          validator: (value, model) => {
            if (
              value &&
              (/\.(vue|tsx|jsx)$/.test(String(value).trim()) || !views.has(String(value), String(model.componentPath)))
            )
              return tx('未找到组件，请检查目录和路径')
          },
        },
      },
    },
    {
      prop: 'icon',
      label: tx('菜单图标'),
      show: (_item, values) => values.type !== 'B',
      render: ({ value, setValue }) => <MaIconPicker value={String(value ?? '')} onChange={setValue} />,
    },
    {
      prop: 'link',
      label: tx('外链地址'),
      render: 'Input',
      renderProps: { placeholder: 'https://example.com' },
      show: (_item, values) => values.type === 'L' || values.type === 'I',
    },
    {
      prop: 'redirect',
      label: tx('重定向'),
      render: 'Input',
      renderProps: { placeholder: tx('默认子路由') },
      show: (_item, values) => values.type === 'M',
    },
    { prop: 'sort', label: tx('排序'), render: 'InputNumber' },
    {
      prop: 'status',
      label: tx('状态'),
      render: 'Select',
      renderProps: {
        options: [
          { value: 1, label: tx('启用') },
          { value: 2, label: tx('禁用') },
        ],
      },
    },
  ]
  return items.map(item => ({ cols: { span: 12 }, ...item }))
}
