import { useTextTranslator } from '@/hooks/i18n/use-translator'
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
import type { MaFormRenderContext } from '@/components/ma-form'
import type { UserForm, DepartmentOption } from '../data/getFormItems'
export function DepartmentTreeSelect({ value, setValue, item }: MaFormRenderContext<UserForm>) {
  const tx = useTextTranslator('base.permission.user.ui')

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
      <CascaderChips ref={anchor} placeholder={tx('请选择部门')} className="w-full" />
      <CascaderContent anchor={anchor} className="min-w-[min(24rem,calc(100vw-2rem))]">
        <CascaderPanel>
          <CascaderNav>
            <CascaderInput placeholder={tx('搜索部门')} />
          </CascaderNav>
          <CascaderEmpty>{tx('暂无可选部门')}</CascaderEmpty>
          <CascaderList>
            <CascaderItems />
          </CascaderList>
          <CascaderStatus />
        </CascaderPanel>
      </CascaderContent>
    </Cascader>
  )
}
