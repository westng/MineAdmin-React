import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { cn } from '@/lib/utils'

function RadioGroup<Value>({ className, ...props }: RadioGroupPrimitive.Props<Value>) {
  return <RadioGroupPrimitive data-slot="radio-group" className={state => cn('flex flex-wrap gap-3', typeof className === 'function' ? className(state) : className)} {...props} />
}

function RadioGroupItem({ className, children, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root data-slot="radio-group-item" className={state => cn('inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-input text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-disabled:cursor-not-allowed data-disabled:opacity-50', typeof className === 'function' ? className(state) : className)} {...props}>
      {children ?? <RadioPrimitive.Indicator className="size-2 rounded-full bg-current" />}
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
