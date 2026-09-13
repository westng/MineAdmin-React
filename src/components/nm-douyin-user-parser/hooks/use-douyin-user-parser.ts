import { useEffect, useRef, useState } from 'react'
import { useMessage } from '@/hooks/useMessage'
import { getDouyinUserProfile } from '../api/douyin-user'
import { extractSecUserId, getParseErrorMessage } from '../utils/parser'
import type { DouyinUserParserOptions } from '../types'

export function useDouyinUserParser({
  value, defaultValue = '', onChange, dataHandle, disabled = false, readOnly = false,
}: DouyinUserParserOptions) {
  const [localValue, setLocalValue] = useState(defaultValue)
  const [loading, setLoading] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const dataHandleRef = useRef(dataHandle)
  const inputValue = value ?? localValue
  const message = useMessage()

  useEffect(() => { dataHandleRef.current = dataHandle }, [dataHandle])

  useEffect(() => () => {
    requestRef.current?.abort()
    requestRef.current = null
  }, [])

  // 外部重置链接或禁用表单后，旧响应不能再回填。
  useEffect(() => () => { requestRef.current?.abort() }, [inputValue, disabled, readOnly])

  function setValue(next: string) {
    requestRef.current?.abort()
    requestRef.current = null
    setLoading(false)
    if (value === undefined) setLocalValue(next)
    onChange?.(next)
  }

  async function parse() {
    if (disabled || readOnly || requestRef.current) return
    let secUserId: string
    try { secUserId = extractSecUserId(inputValue) }
    catch (error) { message.error(getParseErrorMessage(error)); return }

    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    try {
      const user = await getDouyinUserProfile(secUserId, controller.signal)
      if (controller.signal.aborted || requestRef.current !== controller) return
      dataHandleRef.current?.(user)
      message.success('解析成功')
    } catch (error) {
      if (!controller.signal.aborted) message.error(getParseErrorMessage(error))
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setLoading(false)
      }
    }
  }

  return { value: inputValue, loading, setValue, parse, clear: () => setValue('') }
}
