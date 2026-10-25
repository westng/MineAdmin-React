import { createAuthApi } from '@/services/auth/api'
import type { AppRuntime } from '@/provider/runtime/types'

export function createApi(runtime: Pick<AppRuntime, 'http'>) {
  const { captchaApi } = createAuthApi(runtime.http)
  return { getCaptcha: captchaApi }
}
