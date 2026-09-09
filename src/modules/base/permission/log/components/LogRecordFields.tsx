import { Badge } from '@/components/ui/badge'
import type { UserLoginLogVo, UserOperationLogVo } from '../api/log'

export function LogText({ value }: { value: string | number | null | undefined }) {
  const text = value == null || String(value).trim() === '' ? '未记录' : String(value)
  return <span className="block truncate" title={text}>{text}</span>
}

export function LoginStatus({ status }: { status: number | null | undefined }) {
  return <Badge variant={status === 1 ? 'success-light' : status === 2 ? 'destructive-light' : 'secondary'}>
    {status === 1 ? '成功' : status === 2 ? '失败' : '未知'}
  </Badge>
}

function RecordFields({ fields }: { fields: Array<[string, string | number | null | undefined]> }) {
  return <dl className="space-y-4 text-sm">
    {fields.map(([label, value]) => <div key={label} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{value == null || String(value).trim() === '' ? '未记录' : value}</dd>
    </div>)}
  </dl>
}

export function LoginLogDetails({ row }: { row: UserLoginLogVo }) {
  return <div className="space-y-5">
    <LoginStatus status={row.status} />
    <RecordFields fields={[
      ['日志 ID', row.id], ['用户名', row.username], ['登录时间', row.login_time],
      ['登录 IP', row.ip], ['操作系统', row.os], ['浏览器', row.browser],
      ['提示消息', row.message], ['备注', row.remark],
    ]} />
  </div>
}

export function OperationLogDetails({ row }: { row: UserOperationLogVo }) {
  return <RecordFields fields={[
    ['日志 ID', row.id], ['用户名', row.username], ['业务名称', row.service_name],
    ['请求方式', row.method], ['请求路由', row.router], ['请求 IP', row.ip],
    ['操作时间', row.created_at], ['更新时间', row.updated_at], ['备注', row.remark],
  ]} />
}
