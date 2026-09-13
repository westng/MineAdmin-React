import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * 配置可由 props 更新，也可通过实例方法修改；新的 props 值替换旧的实例修改。
 * 在当前 render 直接读取新 props，避免 effect 同步导致子组件先收到旧配置。
 */
export function usePropState<T>(source: T): [T, Dispatch<SetStateAction<T>>] {
  const [snapshot, setSnapshot] = useState(() => ({ source, value: source }))
  const value = Object.is(snapshot.source, source) ? snapshot.value : source
  if (!Object.is(snapshot.source, source)) {
    setSnapshot({ source, value: source })
  }
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(action => {
    setSnapshot(previous => {
      const current = Object.is(previous.source, source) ? previous.value : source
      return { source, value: typeof action === 'function' ? (action as (value: T) => T)(current) : action }
    })
  }, [source])
  return [value, setValue]
}
