import { useActionState, useCallback, useRef, useState } from 'react'
import { LockIcon, MailIcon } from 'lucide-react'
import { Icon as Iconify } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import { FeishuLoginDialog } from '@/modules/feishu/login/components/FeishuLoginDialog'
import type { FeishuLoginResult } from '@/modules/feishu/login/api/login'
import { VerifyCode, type VerifyCodeHandle } from './verify-code'

export interface LoginFormValues {
  username: string
  password: string
  code: string
}

interface LoginFormState {
  fieldErrors: Partial<Record<keyof LoginFormValues, string>>
  formError: string
}

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>
  onFeishuResult: (result: FeishuLoginResult) => Promise<void>
}

const initialState: LoginFormState = {
  fieldErrors: {},
  formError: '',
}

function validate(values: LoginFormValues): LoginFormState['fieldErrors'] {
  const fieldErrors: LoginFormState['fieldErrors'] = {}

  if (!values.username.trim()) {
    fieldErrors.username = '请输入用户名'
  }
  if (!values.password) {
    fieldErrors.password = '请输入密码'
  }
  if (!values.code.trim()) {
    fieldErrors.code = '请输入验证码'
  }

  return fieldErrors
}

export function LoginForm({ onSubmit, onFeishuResult }: LoginFormProps) {
  const captchaRef = useRef<VerifyCodeHandle>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [feishuDialogOpen, setFeishuDialogOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(
    async (_previousState: LoginFormState, formData: FormData): Promise<LoginFormState> => {
      const values: LoginFormValues = {
        username: String(formData.get('username') ?? ''),
        password: String(formData.get('password') ?? ''),
        code: String(formData.get('code') ?? ''),
      }
      const fieldErrors = validate(values)

      if (Object.keys(fieldErrors).length > 0) {
        return { fieldErrors, formError: '' }
      }

      if (!captchaRef.current?.checkResult(values.code)) {
        captchaRef.current?.refresh()
        return {
          fieldErrors: { code: '验证码错误，请点击验证码刷新后重试' },
          formError: '',
        }
      }

      try {
        await onSubmit(values)
        return initialState
      }
      catch (requestError) {
        return {
          fieldErrors: {},
          formError: requestError instanceof Error ? requestError.message : '登录失败，请检查账号信息',
        }
      }
    },
    initialState,
  )
  const handleCaptchaRefresh = useCallback(() => setCode(''), [])

  return (
    <form action={formAction} noValidate aria-busy={isPending}>
      <FieldGroup className="gap-3">
        <Field data-invalid={Boolean(state.fieldErrors.username)}>
          <FieldLabel htmlFor="username">电子邮件</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <MailIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="username"
              name="username"
              type="email"
              value={username}
              placeholder="m@example.com"
              autoComplete="username"
              aria-invalid={Boolean(state.fieldErrors.username)}
              disabled={isPending}
              onChange={event => setUsername(event.target.value)}
            />
          </InputGroup>
          <FieldError>{state.fieldErrors.username}</FieldError>
        </Field>

        <Field data-invalid={Boolean(state.fieldErrors.password)}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">密码</FieldLabel>
            <Button type="button" variant="link" size="sm" disabled={isPending}>忘记密码了吗？</Button>
          </div>
          <InputGroup>
            <InputGroupAddon>
              <LockIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="password"
              name="password"
              type="password"
              value={password}
              autoComplete="current-password"
              aria-invalid={Boolean(state.fieldErrors.password)}
              disabled={isPending}
              onChange={event => setPassword(event.target.value)}
            />
          </InputGroup>
          <FieldError>{state.fieldErrors.password}</FieldError>
        </Field>

        <Field data-invalid={Boolean(state.fieldErrors.code)}>
          <FieldLabel htmlFor="code">验证码</FieldLabel>
          <div className="flex w-full items-start gap-3">
            <InputOTP
              id="code"
              name="code"
              value={code}
              onChange={setCode}
              maxLength={4}
              autoComplete="one-time-code"
              aria-invalid={Boolean(state.fieldErrors.code)}
              disabled={isPending}
              containerClassName="min-w-0 flex-1"
            >
              <InputOTPGroup className="h-8 w-full">
                <InputOTPSlot className="min-w-0 flex-1" index={0} />
                <InputOTPSlot className="min-w-0 flex-1" index={1} />
                <InputOTPSlot className="min-w-0 flex-1" index={2} />
                <InputOTPSlot className="min-w-0 flex-1" index={3} />
              </InputOTPGroup>
            </InputOTP>
            <div className="shrink-0">
              <VerifyCode ref={captchaRef} onRefresh={handleCaptchaRefresh} disabled={isPending} />
            </div>
          </div>
          <FieldError>{state.fieldErrors.code}</FieldError>
        </Field>

        {state.formError && (
          <Field data-invalid>
            <FieldError>{state.formError}</FieldError>
          </Field>
        )}

        <div className="flex flex-col gap-10">
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? '登录中…' : '登录'}
          </Button>

          <div className="relative">
            <Separator />
            <span className="bg-background text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs">
              或者继续
            </span>
          </div>
        </div>

        <Button className="mt-3 w-full" variant="outline" type="button" disabled={isPending} onClick={() => setFeishuDialogOpen(true)}>
          <Iconify icon="icon-park-outline:lark" className="size-4" aria-hidden="true" />
          使用飞书登录
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          还没有账号？{' '}
          <Button type="button" variant="link" size="sm" disabled={isPending}>立即注册</Button>
        </p>
      </FieldGroup>
      {feishuDialogOpen && <FeishuLoginDialog open onOpenChange={setFeishuDialogOpen} onResult={onFeishuResult} />}
    </form>
  )
}
