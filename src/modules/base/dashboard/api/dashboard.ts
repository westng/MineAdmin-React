import type { ReactNode } from 'react'

export type DashboardSlotName = 'main' | 'header' | 'footer'

export interface DashboardSlotRegistration {
  /** 应用内稳定且唯一的注册 ID。重复 ID 会替换旧注册。 */
  id: string
  /** 未指定时注册到 main 区域。 */
  slot?: DashboardSlotName
  /** 同一插槽内按升序渲染，默认为 0。 */
  order?: number
  /** 由应用负责渲染业务内容；Core 不接收业务 API 或数据模型。 */
  render: () => ReactNode
}
