import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent py-0.5 font-medium leading-none whitespace-nowrap outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        outline: 'border-border bg-transparent text-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        info: 'bg-info text-info-solid-foreground',
        success: 'bg-success text-success-solid-foreground',
        warning: 'bg-warning text-warning-solid-foreground',
        destructive: 'bg-destructive text-destructive-solid-foreground',
        'primary-light': 'border-primary/10 bg-primary/10 text-primary',
        'success-light': 'border-success/15 bg-success/10 text-success-foreground',
        'warning-light': 'border-warning/15 bg-warning/10 text-warning-foreground',
        'destructive-light': 'border-destructive/15 bg-destructive/10 text-destructive-foreground',
      },
      size: {
        compact: 'h-5 min-w-5 gap-1 px-1.5 text-xs [&_svg]:size-3',
        xs: 'h-6 min-w-6 gap-1 px-2 text-xs [&_svg]:size-3',
        sm: 'h-7 min-w-7 gap-1 px-2.5 text-[0.8rem] [&_svg]:size-3.5',
        default: 'h-8 min-w-8 gap-1.5 px-2.5 text-sm [&_svg]:size-4',
        lg: 'h-9 min-w-9 gap-1.5 px-2.5 text-sm [&_svg]:size-4',
      },
      radius: {
        default: 'rounded-sm',
        full: 'rounded-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'compact', radius: 'default' },
  },
)

interface BadgeProps extends useRender.ComponentProps<'span'> {
  variant?: VariantProps<typeof badgeVariants>['variant']
  size?: VariantProps<typeof badgeVariants>['size']
  radius?: VariantProps<typeof badgeVariants>['radius']
}

function Badge({ className, variant, size, radius, render, ...props }: BadgeProps) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      { 'data-slot': 'badge', className: cn(badgeVariants({ variant, size, radius, className })) },
      props,
    ),
  })
}

export { Badge }
