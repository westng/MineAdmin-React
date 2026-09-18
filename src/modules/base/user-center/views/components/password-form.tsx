import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useState, type FormEvent } from 'react'
import { Check, KeyRound, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/reui/primitives/field'
import { Input } from '@/components/reui/primitives/input'
import { updateCurrentUser } from '@/modules/base/account-settings/api/account'

const tx = createTextTranslator('base.user-center.ui')

function responseMessage(response: { data?: { code?: number; message?: string } }) {
  return response.data?.message || tx('操作失败')
}

interface PasswordFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function PasswordForm({ onSuccess, onCancel }: PasswordFormProps) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!oldPassword) {
      setMessage({ type: 'error', text: tx('请输入当前密码') })
      return
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: tx('新密码至少需要 8 位') })
      return
    }
    if (newPassword !== confirmation) {
      setMessage({ type: 'error', text: tx('两次输入的新密码不一致') })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const response = await updateCurrentUser({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirmation: confirmation,
      })
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      setOldPassword('')
      setNewPassword('')
      setConfirmation('')
      setMessage({ type: 'success', text: tx('密码修改成功') })
      onSuccess?.()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : tx('密码修改失败') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="profile-old-password">{tx('当前密码')}</FieldLabel>
          <Input
            id="profile-old-password"
            type="password"
            value={oldPassword}
            autoComplete="current-password"
            placeholder={tx('请输入当前密码')}
            onChange={event => setOldPassword(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-new-password">{tx('新密码')}</FieldLabel>
          <Input
            id="profile-new-password"
            type="password"
            value={newPassword}
            autoComplete="new-password"
            placeholder={tx('请输入新密码')}
            onChange={event => setNewPassword(event.target.value)}
          />
        </Field>
        <Field data-invalid={Boolean(confirmation && newPassword !== confirmation)}>
          <FieldLabel htmlFor="profile-password-confirmation">{tx('确认新密码')}</FieldLabel>
          <Input
            id="profile-password-confirmation"
            type="password"
            value={confirmation}
            autoComplete="new-password"
            placeholder={tx('请再次输入新密码')}
            onChange={event => setConfirmation(event.target.value)}
          />
          {confirmation && newPassword !== confirmation && <FieldError>{tx('两次输入的新密码不一致')}</FieldError>}
        </Field>
        {message && (
          <div
            className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-success-foreground' : 'text-destructive'}`}
            role="status"
          >
            {message.type === 'success' && <Check className="size-4" aria-hidden="true" />}
            {message.text}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <KeyRound className="size-4" aria-hidden="true" />
            {tx('密码长度至少为 8 位')}
          </div>
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                {tx('取消')}
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {saving ? tx('保存中…') : tx('修改密码')}
            </Button>
          </div>
        </div>
      </FieldGroup>
    </form>
  )
}
