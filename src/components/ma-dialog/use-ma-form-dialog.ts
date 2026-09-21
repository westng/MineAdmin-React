import { useEffect, useRef, useState } from 'react'
import type { MaFormExpose, MaFormModel, MaFormOptions, MaFormProps } from '../ma-form'
import type { MaDialogProps } from './types'

export interface UseMaFormDialogOptions<T extends MaFormModel, Data> {
  defaultValues: () => T
  toValues?: (data: Data) => T
  loadValues?: (data: Data, signal: AbortSignal) => Promise<T>
  onSubmit: (values: T, data: Data) => void | boolean | Promise<void | boolean>
  onSuccess?: (values: T, data: Data) => void | Promise<void>
  onError: (error: unknown) => void
  canSubmit?: (data: Data) => boolean
  formOptions?: MaFormOptions
}

/** 页面声明业务字段和保存操作，Hook 管理每次打开的表单会话。 */
export function useMaFormDialog<T extends MaFormModel, Data = undefined>(options: UseMaFormDialogOptions<T, Data>) {
  const formRef = useRef<MaFormExpose<T>>(null)
  const sessionRef = useRef<{
    data: Data
    controller: AbortController
    ready: boolean
    saving: boolean
  } | null>(null)
  const [data, setData] = useState<Data>()
  const [values, setValues] = useState(options.defaultValues)
  const [isOpen, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)

  useEffect(
    () => () => {
      sessionRef.current?.controller.abort()
      sessionRef.current = null
    },
    [],
  )

  function close() {
    if (sessionRef.current?.saving) return
    sessionRef.current?.controller.abort()
    sessionRef.current = null
    setOpen(false)
    setLoading(false)
  }

  function open(nextData: Data) {
    if (sessionRef.current?.saving) return
    sessionRef.current?.controller.abort()
    const session = {
      data: nextData,
      controller: new AbortController(),
      ready: !options.loadValues,
      saving: false,
    }
    sessionRef.current = session
    setData(nextData)
    setValues(options.toValues?.(nextData) ?? options.defaultValues())
    setFormKey(key => key + 1)
    setOpen(true)
    setReady(session.ready)
    setLoading(!session.ready)
    setSaving(false)
    setLoadError(null)
    if (options.loadValues) {
      void Promise.resolve()
        .then(() => options.loadValues!(nextData, session.controller.signal))
        .then(nextValues => {
          if (sessionRef.current !== session) return
          session.ready = true
          setValues(nextValues)
          setFormKey(key => key + 1)
          setReady(true)
          setLoading(false)
        })
        .catch(error => {
          if (sessionRef.current !== session) return
          setLoadError(error)
          setLoading(false)
          options.onError(error)
        })
    }
  }

  async function submit(validatedValues?: T) {
    const session = sessionRef.current
    if (!session?.ready || session.saving || options.canSubmit?.(session.data) === false) return
    session.saving = true
    setSaving(true)
    let completed = false
    try {
      let submittedValues = validatedValues
      if (!submittedValues) {
        if (!(await formRef.current?.validate())?.valid) return
        submittedValues = formRef.current!.getValues()
      }
      if (sessionRef.current !== session || options.canSubmit?.(session.data) === false) return
      const result = await options.onSubmit(submittedValues, session.data)
      if (sessionRef.current !== session || result === false) return
      sessionRef.current = null
      completed = true
      setOpen(false)
      setSaving(false)
      await options.onSuccess?.(submittedValues, session.data)
    } catch (error) {
      // A detached session must not display errors for a different record.
      if (sessionRef.current === session || completed) options.onError(error)
    } finally {
      session.saving = false
      if (sessionRef.current === session) setSaving(false)
    }
  }

  const allowed = isOpen && options.canSubmit?.(data as Data) !== false
  const dialogProps: MaDialogProps = {
    open: isOpen,
    loading: saving,
    showOkButton: allowed,
    okDisabled: !ready,
    onOpenChange: (nextOpen, details) => {
      if (nextOpen) return
      if (sessionRef.current?.saving) details.cancel()
      else close()
    },
    onOk: async () => {
      await submit()
      return false
    },
  }
  const formProps: MaFormProps<T> & { ref: typeof formRef } = {
    ref: formRef,
    modelValue: values,
    onModelValueChange: setValues,
    onSubmit: submit,
    options: { ...options.formOptions, disabled: !ready || saving || !allowed || options.formOptions?.disabled },
  }
  return { open, close, data, values, formKey, loading, saving, ready, loadError, dialogProps, formProps }
}
