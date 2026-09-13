import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { themeColors } from '@/provider/settings/colors'

interface ThemeColorPickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  compact?: boolean
}

export function ThemeColorPicker({ value, onChange, className, compact = false }: ThemeColorPickerProps) {
  return (
    <div role="radiogroup" aria-label="配色" className={cn('flex flex-wrap items-center gap-2', className)}>
      {themeColors.map(color => {
        const selected = value.toUpperCase() === color.value.toUpperCase()
        return (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color.label}
            title={color.label}
            onClick={() => onChange(color.value)}
            className={cn(
              cn('flex items-center justify-center rounded-full border-2 border-background shadow-sm outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', compact ? 'size-4' : 'size-5'),
              selected && 'ring-2 ring-ring ring-offset-1',
            )}
            style={{ backgroundColor: color.value }}
          >
            {selected && <Check className={cn(compact ? 'size-2.5' : 'size-3', 'text-white drop-shadow')} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
