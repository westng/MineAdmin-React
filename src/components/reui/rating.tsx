import { useRef, useState } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils/cn"
import { StarIcon } from "lucide-react"

const ratingVariants = cva("flex items-center", {
  variants: {
    size: {
      sm: "gap-2",
      default: "gap-2.5",
      lg: "gap-3",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

const starVariants = cva("", {
  variants: {
    size: {
      sm: "w-4 h-4",
      default: "w-5 h-5",
      lg: "w-6 h-6",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

const valueVariants = cva("text-muted-foreground w-5", {
  variants: {
    size: {
      sm: "text-xs",
      default: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

function Rating({
  rating,
  maxRating = 5,
  size,
  className,
  starClassName,
  showValue = false,
  editable = false,
  disabled = false,
  readOnly = false,
  onRatingChange,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof ratingVariants> & {
    /**
     * Current rating value (supports decimal values for partial stars)
     */
    rating: number
    /**
     * Maximum rating value (number of stars to show)
     */
    maxRating?: number
    /**
     * Whether to show the numeric rating value
     */
    showValue?: boolean
    /**
     * Class name for the value span
     */
    starClassName?: string
    /**
     * Whether the rating is editable (clickable)
     */
    editable?: boolean
    disabled?: boolean
    readOnly?: boolean
    /**
     * Callback function called when rating changes
     */
    onRatingChange?: (rating: number) => void
  }) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const count = Number.isFinite(maxRating) ? Math.max(0, Math.floor(maxRating)) : 5
  const canEdit = editable && !disabled && !readOnly && props["aria-disabled"] !== true && props["aria-disabled"] !== "true"
  const displayRating = canEdit && hoveredRating !== null ? hoveredRating : rating
  const selected = Math.min(count, Math.max(1, Math.round(rating)))
  const commit = (next: number) => { if (canEdit) onRatingChange?.(next) }
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: number) => {
    if (!canEdit) return
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
    let next: number
    switch (event.key) {
      case "ArrowRight": next = current + (rtl ? -1 : 1); break
      case "ArrowLeft": next = current + (rtl ? 1 : -1); break
      case "ArrowDown": next = current + 1; break
      case "ArrowUp": next = current - 1; break
      case "Home": next = 1; break
      case "End": next = count; break
      case "Enter":
      case " ": next = current; break
      default: return
    }
    event.preventDefault()
    next = ((next - 1 + count) % count) + 1
    buttons.current[next - 1]?.focus()
    commit(next)
  }

  const stars = []
  for (let i = 1; i <= count; i++) {
    const filled = displayRating >= i
    const partial = displayRating > i - 1 && displayRating < i
    const fillPercentage = partial ? (displayRating - (i - 1)) * 100 : 0
    const graphic = <>
      <StarIcon aria-hidden="true" data-slot="rating-star-empty" className={cn(starVariants({ size }), "text-muted-foreground/30")} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ width: filled ? "100%" : `${fillPercentage}%` }}>
        <StarIcon data-slot="rating-star-filled" className={cn(starVariants({ size }), "fill-yellow-400 text-yellow-400")} />
      </div>
    </>
    stars.push(editable ? <button
      key={i}
      ref={(node) => { buttons.current[i - 1] = node }}
      type="button"
      role="radio"
      aria-label={`${i} of ${count}`}
      aria-checked={rating === i}
      disabled={!canEdit}
      tabIndex={canEdit && i === selected ? 0 : -1}
      className={cn("relative rounded-sm border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2", canEdit && "cursor-pointer")}
      onClick={() => commit(i)}
      onKeyDown={(event) => onKeyDown(event, i)}
      onMouseEnter={() => { if (canEdit) setHoveredRating(i) }}
      onMouseLeave={() => setHoveredRating(null)}
      onBlur={() => setHoveredRating(null)}
    >{graphic}</button> : <span key={i} aria-hidden="true" className="relative">{graphic}</span>)
  }

  return (
    <div
      data-slot="rating"
      role={editable ? "radiogroup" : "img"}
      aria-label={editable ? "Rating" : `Rating ${rating} of ${count}`}
      aria-disabled={editable && !canEdit || undefined}
      aria-readonly={editable && readOnly || undefined}
      className={cn(ratingVariants({ size }), className)}
      {...props}
    >
      <div className="flex items-center">{stars}</div>
      {showValue && <span data-slot="rating-value" className={cn(valueVariants({ size }), starClassName)}>{displayRating.toFixed(1)}</span>}
    </div>
  )
}

export { Rating }