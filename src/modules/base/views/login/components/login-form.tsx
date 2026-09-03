import { useActionState, useCallback, useRef, useState } from 'react'
import { LockIcon, MailIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
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
}

const initialState: LoginFormState = {
  fieldErrors: {},
  formError: '',
}

function GithubMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
    </svg>
  )
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

export function LoginForm({ onSubmit }: LoginFormProps) {
  const captchaRef = useRef<VerifyCodeHandle>(null)
  const [code, setCode] = useState('')
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
        <Field className="gap-3" data-invalid={Boolean(state.fieldErrors.username)}>
          <FieldLabel htmlFor="username">电子邮件</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <MailIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="username"
              name="username"
              type="email"
              placeholder="m@example.com"
              autoComplete="username"
              aria-invalid={Boolean(state.fieldErrors.username)}
              disabled={isPending}
            />
          </InputGroup>
          <FieldError>{state.fieldErrors.username}</FieldError>
        </Field>

        <Field className="gap-3" data-invalid={Boolean(state.fieldErrors.password)}>
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
              autoComplete="current-password"
              aria-invalid={Boolean(state.fieldErrors.password)}
              disabled={isPending}
            />
          </InputGroup>
          <FieldError>{state.fieldErrors.password}</FieldError>
        </Field>

        <Field className="gap-3" data-invalid={Boolean(state.fieldErrors.code)}>
          <FieldLabel htmlFor="code">验证码</FieldLabel>
          <div className="flex w-full items-center gap-3">
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
              <InputOTPGroup className="w-full">
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

        <div className="flex flex-col gap-8">
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? '登录中…' : '登录'}
          </Button>

          <FieldSeparator className="my-0">或者继续</FieldSeparator>
        </div>

        <Button className="w-full" variant="outline" type="button" disabled={isPending}>
          <GithubMark />
          使用 GitHub 登录
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          还没有账号？{' '}
          <Button type="button" variant="link" size="sm" disabled={isPending}>立即注册</Button>
        </p>
      </FieldGroup>
    </form>
  )
}
