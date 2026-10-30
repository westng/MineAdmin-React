import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { cn } from '@/utils/cn'

function Progress({ className, children, value, ...props }: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={state =>
        cn('cn-progress-root flex flex-wrap gap-3', typeof className === 'function' ? className(state) : className)
      }
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={state =>
        cn(
          'cn-progress-track relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted',
          typeof className === 'function' ? className(state) : className,
        )
      }
      {...props}
    />
  )
}

function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={state =>
        cn(
          'cn-progress-indicator h-full bg-primary transition-all data-indeterminate:w-1/3 data-indeterminate:animate-pulse motion-reduce:animate-none motion-reduce:transition-none',
          typeof className === 'function' ? className(state) : className,
        )
      }
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      className={state =>
        cn('cn-progress-label text-sm font-medium', typeof className === 'function' ? className(state) : className)
      }
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      className={state =>
        cn(
          'cn-progress-value ml-auto text-sm text-muted-foreground tabular-nums',
          typeof className === 'function' ? className(state) : className,
        )
      }
      {...props}
    />
  )
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue }
