import { Check } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/reui/primitives/tooltip'
import { cn } from '@/utils/cn'

export interface ThemeColorOption {
  value: string
  label: string
}

export interface ThemeColorPickerProps {
  colors: readonly ThemeColorOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  compact?: boolean
}

export function ThemeColorPicker({ colors, value, onChange, className, compact = false }: ThemeColorPickerProps) {
  return (
    <TooltipProvider>
      <div role="radiogroup" aria-label="配色" className={cn('flex flex-wrap items-center gap-2', className)}>
        {colors.map((color, index) => {
          const selected = value.toUpperCase() === color.value.toUpperCase()
          return (
            <Tooltip key={color.value}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={
                      selected ||
                      (!colors.some(item => item.value.toUpperCase() === value.toUpperCase()) && index === 0)
                        ? 0
                        : -1
                    }
                    onKeyDown={event => {
                      const delta = ['ArrowRight', 'ArrowDown'].includes(event.key)
                        ? 1
                        : ['ArrowLeft', 'ArrowUp'].includes(event.key)
                          ? -1
                          : 0
                      if (!delta) return
                      event.preventDefault()
                      const next = (index + delta + colors.length) % colors.length
                      onChange(colors[next].value)
                      const buttons =
                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                      buttons?.[next]?.focus()
                    }}
                    aria-label={color.label}
                    onClick={() => onChange(color.value)}
                    className={cn(
                      cn(
                        'flex items-center justify-center rounded-full border-2 border-background shadow-sm outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        compact ? 'size-4' : 'size-5',
                      ),
                      selected && 'ring-2 ring-ring ring-offset-1',
                    )}
                    style={{ backgroundColor: color.value }}
                  >
                    {selected && (
                      <Check
                        className={cn(compact ? 'size-2.5' : 'size-3', 'text-white drop-shadow')}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                }
              />
              <TooltipContent>{color.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
