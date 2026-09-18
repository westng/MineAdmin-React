import { z } from 'zod'
import type { MenuVo } from './permission'
const code = z.string().trim().min(1)
const condition = z.union([code, z.array(code).min(1)])
// The existing menu contract uses empty legacy arrays to mean no restriction.
const legacyCondition = z
  .union([code, z.array(code)])
  .transform(value => (Array.isArray(value) && value.length === 0 ? undefined : value))
const meta = z
  .object({
    permission: condition.optional(),
    permissions: condition.optional(),
    role: legacyCondition.optional(),
    roles: condition.optional(),
    user: legacyCondition.optional(),
    auth: z.union([z.boolean(), legacyCondition]).optional(),
    cache: z.boolean().optional(),
    hidden: z.boolean().optional(),
  })
  .passthrough()
const menu: z.ZodType<MenuVo> = z.lazy(() =>
  z
    .object({
      name: z.string().optional(),
      path: z.string().optional(),
      route: z.string().optional(),
      component: z.string().optional(),
      status: z.number().optional(),
      meta: meta.optional(),
      children: z.array(menu).optional(),
    })
    .passthrough(),
)
export const menusSchema = z.array(menu)
export const rolesSchema = z.array(z.object({ code: z.string().min(1) }).passthrough())
