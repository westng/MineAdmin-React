import { Cascader } from '@/components/reui/cascader/cascader'
import { TreeSelectContent } from './tree-select-content'
import { removeExcludedNodes } from '../utils/tree-options'
import type { MaTreeSelectProps } from '../types'

export function MaTreeSelect<T>(props: MaTreeSelectProps<T>) {
  const {
    items,
    rootOption,
    excludeValues = [],
    placeholder = '请选择',
    searchPlaceholder = '搜索',
    emptyText = '未找到选项',
    ariaLabel,
    maxHeight = 240,
    selectable = 'any',
    disabled,
    readOnly,
    required,
    invalid,
    name,
    id,
    className,
    contentClassName,
  } = props
  const excluded = new Set(excludeValues.map(item => String(item)))
  const treeItems = removeExcludedNodes(rootOption ? [rootOption, ...items] : items, excluded)
  const content = (
    <TreeSelectContent
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      ariaLabel={ariaLabel}
      className={className}
      contentClassName={contentClassName}
    />
  )

  if (props.multiple) {
    return (
      <Cascader<T>
        mode="tree"
        multiple
        items={treeItems}
        selectable={selectable}
        cascade={props.cascade}
        max={props.max}
        value={(props.value ?? []).map(item => String(item))}
        onValueChange={props.onValueChange}
        maxHeight={maxHeight}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        invalid={invalid}
        name={name}
        id={id}
      >
        {content}
      </Cascader>
    )
  }

  return (
    <Cascader<T>
      mode="tree"
      items={treeItems}
      selectable={selectable}
      value={props.value == null ? '' : String(props.value)}
      onValueChange={props.onValueChange}
      maxHeight={maxHeight}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      invalid={invalid}
      name={name}
      id={id}
    >
      {content}
    </Cascader>
  )
}
