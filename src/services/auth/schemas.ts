import { z } from 'zod'
import { AppError } from '@/services/errors'
export const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expire_at: z.number().positive().finite(),
})
export const profileSchema = z
  .object({
    id: z.number().optional(),
    username: z.string().min(1),
    nickname: z.string().optional(),
    backend_setting: z
      .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
      .nullable()
      .optional(),
  })
  .passthrough()
export function validateResponse<T>(schema: z.ZodType<T>, value: unknown, module: string): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new AppError('validation', '服务器返回的数据格式无效', module)
  return result.data
}
