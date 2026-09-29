import type { CascaderNode } from '@/components/reui/cascader/cascader-types'

export function removeExcludedNodes<T>(items: CascaderNode<T>[], excluded: Set<string>): CascaderNode<T>[] {
  return items.flatMap(item => {
    if (excluded.has(item.value)) return []
    return [{ ...item, children: item.children ? removeExcludedNodes(item.children, excluded) : undefined }]
  })
}
