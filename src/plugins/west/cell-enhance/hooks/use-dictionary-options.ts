import { useDictStore, type Dictionary } from '@/provider/dictionary'

const EMPTY_OPTIONS: readonly Dictionary[] = []

/** 字典模式按分类 code 订阅共享数据；直接传 options 时不订阅分类。 */
export function useDictionaryOptions(code?: string): readonly Dictionary[] {
  const name = typeof code === 'string' ? code.trim() : ''

  return useDictStore(state => {
    const options = name ? state.dictionaries[name] : undefined
    // 缺失分类使用稳定引用，避免 useSyncExternalStore 反复触发渲染。
    return Array.isArray(options) ? options : EMPTY_OPTIONS
  })
}
