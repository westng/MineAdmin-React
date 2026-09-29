export interface UploadFileMetadata {
  name: string
  type: string
}

export interface UploadValidationOptions {
  multiple: boolean
  currentCount: number
  maxCount: number
  accept: string
  maxSize: number
}
