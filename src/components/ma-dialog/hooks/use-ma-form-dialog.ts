import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { UseMaFormDialogOptions } from '../types'
import type { MaFormExpose, MaFormModel, MaFormProps } from '../../ma-form'
import type { MaDialogProps } from '../types'

type FormSession<T, Data> = {
  data: Data
  controller: AbortController
  ready: boolean
  saving: boolean
  outcome?: { kind: 'success'; values: T; close: boolean } | { kind: 'error'; error: unknown }
}

/** 页面声明业务字段和保存操作，Hook 管理每次打开的可恢复表单会话。 */
export function useMaFormDialog<T extends MaFormModel, Data = undefined>(options: UseMaFormDialogOptions<T, Data>) {
  const formRef = useRef<MaFormExpose<T>>(null)
  const sessionRef = useRef<FormSession<T, Data> | null>(null)
  const active = useRef(true)
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  }, [options])
  const [data, setData] = useState<Data>()
  const [values, setValues] = useState(options.defaultValues)
  const [isOpen, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)

  const applyOutcome = useCallback(async (session: FormSession<T, Data>) => {
    if (!active.current || sessionRef.current !== session || !session.outcome) return
    const outcome = session.outcome
    delete session.outcome
    setSaving(false)
    if (outcome.kind === 'error') {
      latest.current.onError(outcome.error)
    } else if (outcome.close) {
      sessionRef.current = null
      setOpen(false)
      try {
        await latest.current.onSuccess?.(outcome.values, session.data)
      } catch (error) {
        if (active.current && sessionRef.current === null) latest.current.onError(error)
      }
    }
  }, [])

  const loadSession = useCallback((session: FormSession<T, Data>) => {
    const controller = new AbortController()
    session.controller.abort()
    session.controller = controller
    setLoading(true)
    setLoadError(null)
    void Promise.resolve()
      .then(() => latest.current.loadValues!(session.data, controller.signal))
      .then(nextValues => {
        if (sessionRef.current !== session || controller.signal.aborted || !active.current) return
        session.ready = true
        setValues(nextValues)
        setFormKey(key => key + 1)
        setReady(true)
        setLoading(false)
      })
      .catch(error => {
        if (sessionRef.current !== session || controller.signal.aborted || !active.current) return
        setLoadError(error)
        setLoading(false)
        latest.current.onError(error)
      })
  }, [])

  useEffect(() => {
    active.current = true
    const session = sessionRef.current
    if (session) {
      // Activity恢复时将隐藏期间记录的会话终态同步到UI。
      setSaving(session.saving)
      if (session.outcome) void applyOutcome(session)
      else if (!session.ready && session.controller.signal.aborted && latest.current.loadValues) loadSession(session)
    }
    return () => {
      active.current = false
      sessionRef.current?.controller.abort()
      // Activity保留草稿和已启动提交的结果；真实销毁后不再有恢复Effect，也不会执行UI回调。
    }
  }, [applyOutcome, loadSession])

  function close() {
    if (sessionRef.current?.saving) return
    sessionRef.current?.controller.abort()
    sessionRef.current = null
    setOpen(false)
    setLoading(false)
  }

  function open(nextData: Data) {
    if (!active.current || sessionRef.current?.saving) return
    sessionRef.current?.controller.abort()
    const current = latest.current
    const session: FormSession<T, Data> = {
      data: nextData,
      controller: new AbortController(),
      ready: !current.loadValues,
      saving: false,
    }
    sessionRef.current = session
    setData(nextData)
    setValues(current.toValues?.(nextData) ?? current.defaultValues())
    setFormKey(key => key + 1)
    setOpen(true)
    setReady(session.ready)
    setLoading(!session.ready)
    setSaving(false)
    setLoadError(null)
    if (current.loadValues) loadSession(session)
  }

  async function submit(validatedValues?: T) {
    const session = sessionRef.current
    if (!active.current || !session?.ready || session.saving || latest.current.canSubmit?.(session.data) === false)
      return
    session.saving = true
    setSaving(true)
    try {
      let submittedValues = validatedValues
      if (!submittedValues) {
        const form = formRef.current
        if (!(await form?.validate())?.valid) return
        submittedValues = form!.getValues()
      }
      if (!active.current || sessionRef.current !== session || latest.current.canSubmit?.(session.data) === false)
        return
      const result = await latest.current.onSubmit(submittedValues, session.data)
      session.outcome = { kind: 'success', values: submittedValues, close: result !== false }
    } catch (error) {
      session.outcome = { kind: 'error', error }
    } finally {
      session.saving = false
      if (active.current && sessionRef.current === session) {
        setSaving(false)
        await applyOutcome(session)
      }
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
