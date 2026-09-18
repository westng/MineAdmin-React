import { useTranslate } from '@/provider/i18n'
import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { shellSlots } from '@/layouts/slots'
import { useActionState, useCallback, useRef, useState, useSyncExternalStore } from 'react'
import { LockIcon, MailIcon } from 'lucide-react'
import { Marker, MarkerContent } from '@/components/reui/marker'
import { Button } from '@/components/reui/primitives/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/reui/primitives/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/reui/primitives/input-group'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/reui/primitives/input-otp'
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
  usernameType?: 'text' | 'email'
  showAccountLinks?: boolean
  onSubmit: (values: LoginFormValues) => Promise<void>
}

const initialState: LoginFormState = {
  fieldErrors: {},
  formError: '',
}

function validate(values: LoginFormValues, t: (key: string) => string): LoginFormState['fieldErrors'] {
  const fieldErrors: LoginFormState['fieldErrors'] = {}

  if (!values.username.trim()) {
    fieldErrors.username = t('auth.enterUsername')
  }
  if (!values.password) {
    fieldErrors.password = t('auth.enterPassword')
  }
  if (!values.code.trim()) {
    fieldErrors.code = t('auth.enterCaptcha')
  }

  return fieldErrors
}

export function LoginForm({ onSubmit, usernameType = 'text', showAccountLinks = false }: LoginFormProps) {
  const t = useTranslate()
  const shortcuts = useSyncExternalStore(shellSlots.subscribe, shellSlots.getSnapshot, shellSlots.getSnapshot)
  const hasShortcuts = shortcuts.some(entry => entry.slot === 'auth.methods')
  const captchaRef = useRef<VerifyCodeHandle>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [state, formAction, isPending] = useActionState(
    async (_previousState: LoginFormState, formData: FormData): Promise<LoginFormState> => {
      const values: LoginFormValues = {
        username: String(formData.get('username') ?? ''),
        password: String(formData.get('password') ?? ''),
        code: String(formData.get('code') ?? ''),
      }
      const fieldErrors = validate(values, t)

      if (Object.keys(fieldErrors).length > 0) {
        return { fieldErrors, formError: '' }
      }

      if (!captchaRef.current?.checkResult(values.code)) {
        captchaRef.current?.refresh()
        return {
          fieldErrors: { code: t('auth.invalidCaptcha') },
          formError: '',
        }
      }

      try {
        await onSubmit(values)
        return initialState
      } catch (requestError) {
        return {
          fieldErrors: {},
          formError: requestError instanceof Error ? requestError.message : t('auth.failed'),
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
          <FieldLabel htmlFor="username">{t(usernameType === 'email' ? 'auth.email' : 'auth.username')}</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <MailIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="username"
              name="username"
              type={usernameType}
              value={username}
              placeholder={usernameType === 'email' ? 'm@example.com' : t('auth.enterUsername')}
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
            <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
            {showAccountLinks && (
              <Button type="button" variant="link" size="sm" disabled={isPending}>
                {t('auth.forgotPassword')}
              </Button>
            )}
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
          <FieldLabel htmlFor="code">{t('auth.captcha')}</FieldLabel>
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
            {isPending ? t('auth.signingIn') : t('auth.signIn')}
          </Button>

          {hasShortcuts && (
            <Marker variant="separator" className="text-xs">
              <MarkerContent>{t('auth.orContinue')}</MarkerContent>
            </Marker>
          )}
        </div>

        <ShellSlotOutlet slot="auth.methods" disabled={isPending} />
        {showAccountLinks && (
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Button type="button" variant="link" size="sm" disabled={isPending}>
              {t('auth.register')}
            </Button>
          </p>
        )}
      </FieldGroup>
    </form>
  )
}
