import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'relative inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border border-transparent px-1.5 py-0.5 text-xs font-medium leading-none whitespace-nowrap outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        outline: 'border-border bg-transparent text-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        info: 'bg-info text-white',
        success: 'bg-success text-white',
        warning: 'bg-warning text-white',
        destructive: 'bg-destructive text-white',
        'primary-light': 'border-primary/10 bg-primary/10 text-primary',
        'success-light': 'border-success/15 bg-success/10 text-success-foreground',
        'warning-light': 'border-warning/15 bg-warning/10 text-warning-foreground',
        'destructive-light': 'border-destructive/15 bg-destructive/10 text-destructive-foreground',
      },
      radius: {
        default: 'rounded-sm',
        full: 'rounded-full',
      },
    },
    defaultVariants: { variant: 'default', radius: 'default' },
  },
)

interface BadgeProps extends useRender.ComponentProps<'span'> {
  variant?: VariantProps<typeof badgeVariants>['variant']
  radius?: VariantProps<typeof badgeVariants>['radius']
}

function Badge({ className, variant, radius, render, ...props }: BadgeProps) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'badge', className: cn(badgeVariants({ variant, radius, className })) }, props),
  })
}

export { Badge }
