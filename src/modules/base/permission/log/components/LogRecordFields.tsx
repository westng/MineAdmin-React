import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { Badge } from '@/components/reui/primitives/badge'
import type { UserLoginLogVo, UserOperationLogVo } from '../api/log'

const tx = createTextTranslator('base.permission.log.ui')

export function LogText({ value }: { value: string | number | null | undefined }) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const text = value == null || String(value).trim() === '' ? tx('未记录') : String(value)
  return (
    <span className="block truncate" title={text}>
      {text}
    </span>
  )
}

export function LoginStatus({ status }: { status: number | null | undefined }) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <Badge variant={status === 1 ? 'success-light' : status === 2 ? 'destructive-light' : 'secondary'}>
      {status === 1 ? tx('成功') : status === 2 ? tx('失败') : tx('未知')}
    </Badge>
  )
}

function RecordFields({ fields }: { fields: Array<[string, string | number | null | undefined]> }) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <dl className="space-y-4 text-sm">
      {fields.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {value == null || String(value).trim() === '' ? tx('未记录') : value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function LoginLogDetails({ row }: { row: UserLoginLogVo }) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <div className="space-y-5">
      <LoginStatus status={row.status} />
      <RecordFields
        fields={[
          [tx('日志 ID'), row.id],
          [tx('用户名'), row.username],
          [tx('登录时间'), row.login_time],
          [tx('登录 IP'), row.ip],
          [tx('操作系统'), row.os],
          [tx('浏览器'), row.browser],
          [tx('提示消息'), row.message],
          [tx('备注'), row.remark],
        ]}
      />
    </div>
  )
}

export function OperationLogDetails({ row }: { row: UserOperationLogVo }) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <RecordFields
      fields={[
        [tx('日志 ID'), row.id],
        [tx('用户名'), row.username],
        [tx('业务名称'), row.service_name],
        [tx('请求方式'), row.method],
        [tx('请求路由'), row.router],
        [tx('请求 IP'), row.ip],
        [tx('操作时间'), row.created_at],
        [tx('更新时间'), row.updated_at],
        [tx('备注'), row.remark],
      ]}
    />
  )
}
