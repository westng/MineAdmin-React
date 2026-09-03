export interface ResponseStruct<T> {
  code: number
  message?: string
  data: T
  [key: string]: unknown
}

export interface PageList<T> {
  items: T[]
  total: number
  page?: number
  page_size?: number
  [key: string]: unknown
}
