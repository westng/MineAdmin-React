import type React from 'react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
} from 'react'

export type FileMetadata = {
  name: string
  size: number
  type: string
  url: string
  id: string
}

export type FileWithPreview = {
  file: File | FileMetadata
  id: string
  preview?: string
}

export type FileUploadOptions = {
  maxFiles?: number // Only used when multiple is true, defaults to Infinity
  maxSize?: number // in bytes
  accept?: string
  multiple?: boolean // Defaults to false
  initialFiles?: FileMetadata[]
  onFilesChange?: (files: FileWithPreview[]) => void // Callback when files change
  onFilesAdded?: (addedFiles: FileWithPreview[]) => void // Callback when new files are added
  onError?: (errors: string[]) => void
}

export type FileUploadState = {
  files: FileWithPreview[]
  isDragging: boolean
  errors: string[]
}

export type FileUploadActions = {
  addFiles: (files: FileList | File[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  clearErrors: () => void
  handleDragEnter: (e: DragEvent<HTMLElement>) => void
  handleDragLeave: (e: DragEvent<HTMLElement>) => void
  handleDragOver: (e: DragEvent<HTMLElement>) => void
  handleDrop: (e: DragEvent<HTMLElement>) => void
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  openFileDialog: () => void
  getInputProps: (props?: InputHTMLAttributes<HTMLInputElement>) => InputHTMLAttributes<HTMLInputElement> & {
    ref: React.Ref<HTMLInputElement>
  }
}

export const useFileUpload = (options: FileUploadOptions = {}): [FileUploadState, FileUploadActions] => {
  const {
    maxFiles = Number.POSITIVE_INFINITY,
    maxSize = Number.POSITIVE_INFINITY,
    accept = '*',
    multiple = false,
    initialFiles = [],
    onFilesChange,
    onFilesAdded,
    onError,
  } = options

  const [state, setState] = useState<FileUploadState>({
    files: initialFiles.map(file => ({
      file,
      id: file.id,
      preview: file.url,
    })),
    isDragging: false,
    errors: [],
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef<FileWithPreview[]>(state.files)
  const ownedUrls = useRef(new Set<string>())

  useEffect(() => {
    const urls = ownedUrls.current
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  const releasePreview = useCallback((file: FileWithPreview) => {
    if (file.preview && ownedUrls.current.delete(file.preview)) URL.revokeObjectURL(file.preview)
  }, [])

  const validateFile = useCallback(
    (file: File | FileMetadata): string | null => {
      if (file instanceof File) {
        if (file.size > maxSize) {
          return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`
        }
      } else {
        if (file.size > maxSize) {
          return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`
        }
      }

      if (accept !== '*') {
        const acceptedTypes = accept.split(',').map(type => type.trim())
        const fileType = file instanceof File ? file.type || '' : file.type
        const fileExtension = `.${file instanceof File ? file.name.split('.').pop() : file.name.split('.').pop()}`

        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return fileExtension.toLowerCase() === type.toLowerCase()
          }
          if (type.endsWith('/*')) {
            const baseType = type.split('/')[0]
            return fileType.startsWith(`${baseType}/`)
          }
          return fileType === type
        })

        if (!isAccepted) {
          return `File "${file instanceof File ? file.name : file.name}" is not an accepted file type.`
        }
      }

      return null
    },
    [accept, maxSize],
  )

  const createPreview = useCallback((file: File | FileMetadata): string | undefined => {
    if (file instanceof File) {
      const url = URL.createObjectURL(file)
      ownedUrls.current.add(url)
      return url
    }
    return file.url
  }, [])

  const generateUniqueId = useCallback((file: File | FileMetadata): string => {
    if (file instanceof File) {
      return `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }
    return file.id
  }, [])

  const clearFiles = useCallback(() => {
    filesRef.current.forEach(releasePreview)
    filesRef.current = []
    if (inputRef.current) inputRef.current.value = ''
    setState(prev => ({ ...prev, files: [], errors: [] }))
    onFilesChange?.([])
  }, [onFilesChange, releasePreview])

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const candidates = Array.from(newFiles).slice(0, multiple ? undefined : 1)
      if (!candidates.length) return
      const current = filesRef.current
      const accepted: FileWithPreview[] = []
      const errors: string[] = []
      const keys = new Set(multiple ? current.map(item => `${item.file.name}\u0000${item.file.size}`) : [])
      for (const file of candidates) {
        const key = `${file.name}\u0000${file.size}`
        if (keys.has(key)) continue
        const error = validateFile(file)
        if (error) {
          errors.push(error)
          continue
        }
        if (multiple && current.length + accepted.length >= maxFiles) {
          errors.push(`You can only upload a maximum of ${maxFiles} files.`)
          continue
        }
        keys.add(key)
        accepted.push({ file, id: generateUniqueId(file), preview: createPreview(file) })
      }
      if (accepted.length) {
        if (!multiple) current.forEach(releasePreview)
        const files = multiple ? [...current, ...accepted] : accepted
        filesRef.current = files
        setState(prev => ({ ...prev, files, errors }))
        onFilesAdded?.(accepted)
        onFilesChange?.(files)
      } else {
        setState(prev => ({ ...prev, errors }))
      }
      if (errors.length) onError?.(errors)
      if (inputRef.current) inputRef.current.value = ''
    },
    [
      multiple,
      validateFile,
      maxFiles,
      generateUniqueId,
      createPreview,
      releasePreview,
      onFilesAdded,
      onFilesChange,
      onError,
    ],
  )

  const removeFile = useCallback(
    (id: string) => {
      filesRef.current.filter(file => file.id === id).forEach(releasePreview)
      const files = filesRef.current.filter(file => file.id !== id)
      filesRef.current = files
      setState(prev => ({ ...prev, files, errors: [] }))
      onFilesChange?.(files)
    },
    [onFilesChange, releasePreview],
  )

  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: [],
    }))
  }, [])

  const handleDragEnter = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setState(prev => ({ ...prev, isDragging: true }))
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return
    }

    setState(prev => ({ ...prev, isDragging: false }))
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setState(prev => ({ ...prev, isDragging: false }))

      // Don't process files if the input is disabled
      if (inputRef.current?.disabled) {
        return
      }

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // In single file mode, only use the first file
        if (!multiple) {
          const file = e.dataTransfer.files[0]
          addFiles([file])
        } else {
          addFiles(e.dataTransfer.files)
        }
      }
    },
    [addFiles, multiple],
  )

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files)
      }
    },
    [addFiles],
  )

  const openFileDialog = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }, [])

  const getInputProps = useCallback(
    (props: InputHTMLAttributes<HTMLInputElement> = {}) => {
      return {
        ...props,
        type: 'file' as const,
        onChange: handleFileChange,
        accept: props.accept || accept,
        multiple: props.multiple !== undefined ? props.multiple : multiple,
        ref: inputRef,
      }
    },
    [accept, multiple, handleFileChange],
  )

  return [
    state,
    {
      addFiles,
      removeFile,
      clearFiles,
      clearErrors,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      handleFileChange,
      openFileDialog,
      getInputProps,
    },
  ]
}

// Helper function to format bytes to human-readable format
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / k ** i).toFixed(dm)) + sizes[i]
}
