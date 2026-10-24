'use client'

import { useEffect } from 'react'
import { motion, type MotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/utils/cn'

function Digit({
  place,
  from,
  to,
  digitHeight,
  duration,
  delay,
}: {
  place: number
  from: number
  to: number
  digitHeight: number
  duration: number
  delay: number
}) {
  const fromValue = Math.floor(from / place)
  const toValue = Math.floor(to / place)
  const animatedValue = useSpring(fromValue, { duration: duration * 1000 })

  useEffect(() => {
    const timeout = setTimeout(() => animatedValue.set(toValue), delay * 1000)
    return () => clearTimeout(timeout)
  }, [animatedValue, delay, toValue])

  return (
    <span style={{ height: digitHeight }} className="relative inline-block w-[1ch] overflow-hidden tabular-nums">
      {Array.from({ length: 10 }, (_, number) => (
        <DigitNumber key={number} mv={animatedValue} number={number} digitHeight={digitHeight} />
      ))}
    </span>
  )
}

function DigitNumber({ mv, number, digitHeight }: { mv: MotionValue<number>; number: number; digitHeight: number }) {
  const y = useTransform(mv, (latest: number) => {
    const placeValue = latest % 10
    const offset = (10 + number - placeValue) % 10
    let distance = offset * digitHeight

    if (offset > 5) distance -= 10 * digitHeight
    return distance
  })

  return (
    <motion.span style={{ y }} className="absolute inset-0 flex items-center justify-center">
      {number}
    </motion.span>
  )
}

export interface SlidingNumberProps {
  from: number
  to: number
  duration?: number
  delay?: number
  className?: string
  digitHeight?: number
  decimalPlaces?: number
  useGrouping?: boolean
  onComplete?: () => void
}

/** ReUI's per-digit rolling number effect, extended for currency decimals and grouping. */
export function SlidingNumber({
  from,
  to,
  duration = 0.8,
  delay = 0,
  className,
  digitHeight = 32,
  decimalPlaces = 0,
  useGrouping = false,
  onComplete,
}: SlidingNumberProps) {
  const reducedMotion = useReducedMotion()
  const safeDecimalPlaces = Math.max(0, Math.floor(decimalPlaces))
  const scale = 10 ** safeDecimalPlaces
  const scaledFrom = Math.round((Number.isFinite(from) ? from : 0) * scale)
  const scaledTo = Math.round((Number.isFinite(to) ? to : 0) * scale)

  useEffect(() => {
    const timeout = setTimeout(() => onComplete?.(), (reducedMotion ? 0 : delay + duration) * 1000)
    return () => clearTimeout(timeout)
  }, [delay, duration, onComplete, reducedMotion, scaledFrom, scaledTo])

  const absoluteFrom = Math.abs(scaledFrom)
  const absoluteTo = Math.abs(scaledTo)
  const maxDigits = Math.max(
    Math.abs(scaledFrom).toString().length,
    Math.abs(scaledTo).toString().length,
    safeDecimalPlaces + 1,
  )
  const integerDigits = Math.max(1, maxDigits - safeDecimalPlaces)
  const places = Array.from({ length: maxDigits }, (_, index) => 10 ** (maxDigits - index - 1))

  return (
    <span className={cn('inline-flex items-center', className)} aria-label={to.toFixed(safeDecimalPlaces)}>
      {scaledTo < 0 && '-'}
      {places.map((place, index) => {
        const showDecimalSeparator = safeDecimalPlaces > 0 && index === integerDigits
        const showGroupSeparator =
          useGrouping && index > 0 && index < integerDigits && (integerDigits - index) % 3 === 0
        return (
          <span key={place} className="inline-flex items-center">
            {showGroupSeparator && <span aria-hidden="true">,</span>}
            {showDecimalSeparator && <span aria-hidden="true">.</span>}
            <Digit
              place={place}
              from={absoluteFrom}
              to={absoluteTo}
              digitHeight={digitHeight}
              duration={reducedMotion ? 0 : duration}
              delay={reducedMotion ? 0 : delay}
            />
          </span>
        )
      })}
    </span>
  )
}
