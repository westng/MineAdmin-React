import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { Button } from '@/components/reui/primitives/button'
import type { LoginCaptcha } from '@/services/auth/types'
import { createApi } from '../../api/captcha'

export interface VerifyCodeHandle {
  getChallengeId: () => string | null
  refresh: () => void
}

interface VerifyCodeProps {
  ref?: Ref<VerifyCodeHandle>
  onRefresh?: () => void
  onReadyChange?: (ready: boolean) => void
  disabled?: boolean
}

export function VerifyCode({ onRefresh, onReadyChange, disabled, ref }: VerifyCodeProps) {
  const tx = useTextTranslator('base.auth.ui')
  const { getCaptcha } = useRuntimeFactory(createApi)
  const [challenge, setChallenge] = useState<(LoginCaptcha & { expiresAt: number }) | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setChallenge(null)
    setLoading(true)
    setError('')
    onReadyChange?.(false)
    onRefresh?.()
    try {
      const result = await getCaptcha(controller.signal)
      if (requestRef.current !== controller || controller.signal.aborted) return
      setChallenge({ ...result, expiresAt: Date.now() + result.expires_in * 1000 })
      onReadyChange?.(true)
    } catch (error) {
      if (requestRef.current !== controller || controller.signal.aborted) return
      setError(
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : tx('验证码加载失败，请点击重试'),
      )
    } finally {
      if (requestRef.current === controller && !controller.signal.aborted) setLoading(false)
    }
  }, [getCaptcha, onReadyChange, onRefresh, tx])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => {
      window.clearTimeout(timer)
      requestRef.current?.abort()
      requestRef.current = null
    }
  }, [load])

  useEffect(() => {
    if (!challenge) return
    const timer = window.setTimeout(
      () => {
        setChallenge(null)
        onReadyChange?.(false)
      },
      Math.max(0, challenge.expiresAt - Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [challenge, onReadyChange])

  useImperativeHandle(
    ref,
    () => ({
      getChallengeId: () => (challenge && challenge.expiresAt > Date.now() ? challenge.captcha_id : null),
      refresh: () => {
        void load()
      },
    }),
    [challenge, load],
  )

  return (
    <div className="max-w-[160px] space-y-1">
      <Button
        type="button"
        variant="outline"
        className="h-8 w-[120px] overflow-hidden p-0 leading-none"
        aria-label={tx('刷新验证码')}
        onClick={() => void load()}
        disabled={disabled || loading}
        aria-busy={loading}
      >
        {challenge ? (
          <img src={challenge.image} className="h-full w-full" alt={tx('登录验证码')} />
        ) : (
          <span className="text-xs">{loading ? tx('加载中…') : tx('点击刷新验证码')}</span>
        )}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
