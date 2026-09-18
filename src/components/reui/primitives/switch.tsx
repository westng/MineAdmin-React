import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from '@/utils/cn'

function Switch({ className, children, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={state =>
        cn(
          'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input transition-colors outline-none data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 focus-visible:ring-3 focus-visible:ring-ring/50',
          typeof className === 'function' ? className(state) : className,
        )
      }
      {...props}
    >
      {children ?? (
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className="pointer-events-none size-4 rounded-full bg-background shadow-xs transition-transform data-checked:translate-x-4 rtl:data-checked:-translate-x-4"
        />
      )}
    </SwitchPrimitive.Root>
  )
}

export { Switch }
