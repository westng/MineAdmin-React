import type { AppRuntime } from '@/provider/runtime/types'
import { createApi as createLogApi } from '../../operation-log/api/log'

export type { UserLoginLogVo, LoginLogParams, LogPage } from '../../operation-log/api/log'

/** 登录日志与操作日志共用日志协议，此模块只暴露登录日志资源。 */
export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const { userLoginLogApi } = createLogApi(runtime)
  return { userLoginLogApi }
}
