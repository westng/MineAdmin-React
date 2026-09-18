export interface LoginParams {
  username: string
  password: string
  code?: string
}

export interface LoginResult {
  access_token: string
  expire_at: number
  refresh_token: string
}

export interface UserDepartmentInfo {
  id: number
  name: string
}

export interface UserPositionInfo {
  id: number
  dept_id: number
  name: string
}

export interface UserRoleInfo {
  id: number
  code: string
  name: string
}

export interface CurrentUserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string | null
  phone?: string | null
  email?: string | null
  signed?: string | null
  status?: 1 | 2
  login_ip?: string | null
  login_time?: string | null
  dashboard?: string
  backend_setting?: Record<string, unknown> | unknown[] | null
  departments?: UserDepartmentInfo[]
  positions?: UserPositionInfo[]
  roles?: UserRoleInfo[]
}
