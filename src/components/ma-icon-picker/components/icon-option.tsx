import { Icon } from '@iconify/react'
import { CircleHelp, LoaderCircle } from 'lucide-react'
import { useIcon } from '@/components/ma-icon'
import { Button } from '@/components/reui/primitives/button'
import { cn } from '@/utils/cn'

export function IconOption({
  name,
  selected,
  disabled,
  onSelect,
}: {
  name: string
  selected: boolean
  disabled?: boolean
  onSelect: (value: string) => void
}) {
  const icon = useIcon(name)
  const label =
    icon.status === 'error'
      ? `${name}（加载失败或图标已失效，请检查网络或刷新页面后重试）`
      : icon.status === 'loading'
        ? `${name}（加载中）`
        : name

  return (
    <span className="min-w-0" title={label}>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'h-12 w-full min-w-0 p-2',
          selected && 'bg-primary/10 text-primary ring-2 ring-primary ring-inset',
        )}
        aria-label={label}
        aria-pressed={selected}
        disabled={disabled || icon.status !== 'ready'}
        onClick={() => onSelect(name)}
      >
        {icon.status === 'ready' &&
          ('data' in icon ? (
            <Icon icon={icon.data} className="size-[26px]" aria-hidden="true" />
          ) : (
            <img src={icon.src} className="size-[26px] object-contain" alt="" />
          ))}
        {icon.status === 'loading' && (
          <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        )}
        {icon.status === 'error' && <CircleHelp className="size-5 text-muted-foreground" aria-hidden="true" />}
      </Button>
    </span>
  )
}
