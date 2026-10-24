export const statusLabels: Record<string, string> = {
  pending: '待执行',
  queued: '排队中',
  running: '执行中',
  cancelling: '取消中',
  succeeded: '成功',
  partial_success: '部分成功',
  failed: '失败',
  cancelled: '已取消',
  timed_out: '执行超时',
}
export const triggerLabels: Record<string, string> = {
  manual: '手动触发',
  schedule: '定时触发',
  command: '命令行',
  openapi: '开放接口',
  callback: '回调',
  system: '系统触发',
  retry: '失败重试',
}
export const errorLabels: Record<string, string> = {
  pdd_account_unavailable: '拼多多账户已停用、授权归属变化或无权访问',
  pdd_order_fetch_failed: '拼多多订单查询失败，将按策略重试',
  pdd_order_not_ready: '拼多多订单尚不可查询或返回订单不匹配，将按策略重试',
  source_sync_failed: '平台数据拉取失败，请结合服务日志排查',
  detail_sync_failed: '详情拉取或写入失败',
  execution_failed: '执行异常，请根据追踪编号排查',
  resource_busy: '资源正在同步，等待重试',
  worker_lost: '执行进程失联或租约超时',
  unit_failed: '存在失败的执行单元，请查看详情',
}
export function displayError(code: string | null) {
  return code ? errorLabels[code] || code : '—'
}
export function displayTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value.replace(' ', 'T') + 'Z')
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}
export function isActive(status: string) {
  return ['pending', 'queued', 'running', 'cancelling'].includes(status)
}
