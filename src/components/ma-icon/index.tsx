import { Icon } from '@iconify/react'
import { CircleDot, CircleHelp, LoaderCircle } from 'lucide-react'
import { useIcon } from '@/components/ma-icon/use-icon'
import { cn } from '@/utils/cn'

export type MaIconProps = {
  name: string
  className?: string
  /** 不传时作为装饰图标，交由相邻文本提供可访问名称。 */
  label?: string
}

export function MaIcon({ name, className, label }: MaIconProps) {
  const icon = useIcon(name)

  return (
    <span
      className={cn('inline-flex size-[1em] shrink-0 items-center justify-center align-middle', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={icon.status === 'error' ? `图标加载失败或已失效：${name}` : undefined}
    >
      {icon.status === 'ready' &&
        ('data' in icon ? (
          <Icon icon={icon.data} className="size-full" aria-hidden="true" />
        ) : (
          <img src={icon.src} className="size-full object-contain" alt="" />
        ))}
      {icon.status === 'loading' && <LoaderCircle className="size-full animate-spin motion-reduce:animate-none" />}
      {icon.status === 'error' && <CircleHelp className="size-full text-muted-foreground" />}
      {icon.status === 'empty' && <CircleDot className="size-full text-muted-foreground" />}
    </span>
  )
}
