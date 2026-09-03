import { useCallback, useState } from 'react'

export function useResourcePicker<T>(initial: T[] = []) {
  const [selected, setSelected] = useState<T[]>(initial)
  const toggle = useCallback((item: T, equals: (left: T, right: T) => boolean = Object.is) => {
    setSelected(current => current.some(existing => equals(existing, item))
      ? current.filter(existing => !equals(existing, item))
      : [...current, item])
  }, [])
  return { selected, setSelected, toggle, clear: () => setSelected([]) }
}

export default useResourcePicker
