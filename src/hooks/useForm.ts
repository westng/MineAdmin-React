import { useCallback, useState } from 'react'

export function useForm<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValuesState] = useState<T>(initialValues)
  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState(current => ({ ...current, [field]: value }))
  }, [])
  const setValues = useCallback((next: Partial<T>) => {
    setValuesState(current => ({ ...current, ...next }))
  }, [])
  const reset = useCallback(() => setValuesState(initialValues), [initialValues])
  return { values, setField, setValues, reset }
}

export default useForm
