import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MaUploadProps } from '../types'
import type { UploadFileMetadata } from '../types/internal'
import { normalizeUploadValue, readUploadedUrl, uploadErrorMessage, validateUploadFiles } from '../utils/upload-utils'

/** Owns controlled values, the sequential upload lifecycle and cancellation. */
export function useUpload(props: MaUploadProps) {
  const {
    multiple = false,
    disabled = false,
    readOnly = false,
    accept = '*',
    maxSize = Infinity,
    maxCount = Infinity,
    maxUrlLength = Infinity,
  } = props
  const [internalValues, setInternalValues] = useState(() => normalizeUploadValue(props.defaultValue))
  const values = props.value === undefined ? internalValues : normalizeUploadValue(props.value)
  const [metadata, setMetadata] = useState<Record<string, UploadFileMetadata>>({})
  const [uploading, setUploading] = useState(false)
  const [activeName, setActiveName] = useState('')
  const [error, setError] = useState('')
  const controllerRef = useRef<AbortController | null>(null)
  const latest = useRef(props)
  const valuesRef = useRef(values)
  const unavailable = disabled || readOnly
  useLayoutEffect(() => {
    latest.current = props
    valuesRef.current = values
  }, [props, values])
  useEffect(() => {
    if (unavailable) controllerRef.current?.abort()
  }, [unavailable])
  useEffect(
    () => () => {
      const pending = controllerRef.current
      controllerRef.current = null
      pending?.abort()
      if (pending) latest.current.onUploadingChange?.(false)
    },
    [],
  )
  useEffect(() => () => controllerRef.current?.abort(), [multiple])

  function changeValues(next: string[]) {
    valuesRef.current = next
    setInternalValues(next)
    const current = latest.current
    if (current.multiple) current.onChange?.(next)
    else current.onChange?.(next[0] ?? '')
  }
  async function uploadFiles(files: File[]) {
    if (!files.length || unavailable || controllerRef.current) return
    const validation = validateUploadFiles(files, {
      multiple,
      currentCount: valuesRef.current.length,
      maxCount,
      accept,
      maxSize,
    })
    if (validation) {
      setError(validation)
      return
    }
    const controller = new AbortController()
    controllerRef.current = controller
    setUploading(true)
    setError('')
    latest.current.onUploadingChange?.(true)
    try {
      for (const file of files) {
        if (controller.signal.aborted || controllerRef.current !== controller) break
        setActiveName(file.name)
        const response = await props.request(file, { signal: controller.signal })
        if (controller.signal.aborted || controllerRef.current !== controller) break
        const url = readUploadedUrl(response, maxUrlLength)
        setMetadata(current => ({ ...current, [url]: { name: file.name, type: file.type } }))
        changeValues(multiple ? [...new Set([...valuesRef.current, url])] : [url])
      }
    } catch (reason) {
      if (!controller.signal.aborted) setError(uploadErrorMessage(reason))
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setUploading(false)
        setActiveName('')
        latest.current.onUploadingChange?.(false)
      }
    }
  }
  function removeFile(url: string) {
    if (unavailable || uploading) return
    setError('')
    changeValues(values.filter(item => item !== url))
  }
  return { values, metadata, uploading, activeName, error, unavailable, uploadFiles, removeFile }
}
