import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { Button } from '@/components/ui/button'

const CODE_POOL = 'abcdefghjkmnpqrstuvwxyz23456789'

export interface VerifyCodeHandle {
  checkResult: (value: string) => boolean
  refresh: () => void
}

interface VerifyCodeProps {
  ref?: Ref<VerifyCodeHandle>
  width?: number
  height?: number
  size?: number
  onRefresh?: () => void
  disabled?: boolean
}

function randomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min)
}

function randomColor(min: number, max: number) {
  return `rgb(${randomNumber(min, max)}, ${randomNumber(min, max)}, ${randomNumber(min, max)})`
}

export function VerifyCode({ width = 120, height = 32, size = 4, onRefresh, disabled, ref }: VerifyCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const codeRef = useRef('')

  const drawCode = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      return
    }

    const code = Array.from({ length: size }, () => CODE_POOL[randomNumber(0, CODE_POOL.length)]).join('')
    codeRef.current = code

    context.clearRect(0, 0, width, height)
    context.fillStyle = randomColor(230, 255)
    context.fillRect(0, 0, width, height)
    context.font = '24px SimHei, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'

    for (const [index, character] of [...code].entries()) {
      context.fillStyle = randomColor(80, 150)
      context.fillText(character, ((index + 0.5) * width) / size, height / 2 + randomNumber(-2, 3))
    }

    for (let index = 0; index < 5; index += 1) {
      context.beginPath()
      context.moveTo(randomNumber(0, width), randomNumber(0, height))
      context.lineTo(randomNumber(0, width), randomNumber(0, height))
      context.strokeStyle = randomColor(180, 230)
      context.stroke()
    }

    for (let index = 0; index < 40; index += 1) {
      context.beginPath()
      context.arc(randomNumber(0, width), randomNumber(0, height), 1, 0, 2 * Math.PI)
      context.fillStyle = randomColor(150, 200)
      context.fill()
    }

    onRefresh?.()
  }, [height, onRefresh, size, width])

  useEffect(() => {
    drawCode()
  }, [drawCode])

  const checkResult = useCallback((value: string) => {
    return value.trim().toLowerCase() === codeRef.current.toLowerCase()
  }, [])

  useImperativeHandle(ref, () => ({ checkResult, refresh: drawCode }), [checkResult, drawCode])

  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      className="w-[120px] overflow-hidden p-0"
      aria-label="刷新验证码"
      onClick={drawCode}
      disabled={disabled}
    >
      <canvas ref={canvasRef} width={width} height={height} aria-hidden="true" />
      <span className="sr-only">点击刷新验证码</span>
    </Button>
  )
}
