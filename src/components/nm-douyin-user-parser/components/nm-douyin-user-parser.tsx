import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useDouyinUserParser } from '../hooks/use-douyin-user-parser'
import type { NmDouyinUserParserProps } from '../types'

export function NmDouyinUserParser({
  value, defaultValue, onChange, dataHandle,
  disabled = false, readOnly = false, placeholder = '请输入达人主页链接',
  className, style, onKeyDown, ...inputProps
}: NmDouyinUserParserProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const parser = useDouyinUserParser({ value, defaultValue, onChange, dataHandle, disabled, readOnly })

  return <div className={cn('flex min-w-0 items-center gap-2', className)} style={style} role="group" aria-label="抖音用户解析" aria-busy={parser.loading}>
    <Input
      {...inputProps}
      ref={inputRef}
      className="w-auto min-w-0 flex-1"
      value={parser.value}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      aria-label={inputProps['aria-label'] ?? '抖音用户主页链接'}
      onChange={event => parser.setValue(event.target.value)}
      onKeyDown={event => {
        onKeyDown?.(event)
        if (!event.defaultPrevented && event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault()
          void parser.parse()
        }
      }}
    />
    <Button type="button" disabled={disabled || readOnly || parser.loading} onClick={() => void parser.parse()}>
      {parser.loading && <Spinner aria-hidden="true" />}
      {parser.loading ? '解析中…' : '解析'}
    </Button>
    <Button type="button" variant="outline" disabled={disabled || readOnly || !parser.value} onClick={() => { parser.clear(); inputRef.current?.focus() }}>清空</Button>
  </div>
}
