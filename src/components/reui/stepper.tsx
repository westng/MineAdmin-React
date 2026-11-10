import type { HTMLAttributes, ReactElement } from "react"
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/utils/cn"

// Types
type StepperOrientation = "horizontal" | "vertical"
type StepState = "active" | "completed" | "inactive" | "loading"
type StepIndicators = {
  active?: React.ReactNode
  completed?: React.ReactNode
  inactive?: React.ReactNode
  loading?: React.ReactNode
}

interface StepperContextValue {
  activeStep: number
  setActiveStep: (step: number) => void
  stepsCount: number
  orientation: StepperOrientation
  registerTrigger: (node: HTMLButtonElement | null) => () => void
  registerItem: (token: string) => () => void
  registerId: (kind: "tab" | "panel", step: number, id: string) => () => void
  baseId: string
  tabId: (step: number) => string
  panelId: (step: number) => string
  triggerNodes: HTMLButtonElement[]
  focusNext: (currentIdx: number) => void
  focusPrev: (currentIdx: number) => void
  focusFirst: () => void
  focusLast: () => void
  indicators: StepIndicators
}

interface StepItemContextValue {
  step: number
  state: StepState
  isDisabled: boolean
  isLoading: boolean
}

const StepperContext = createContext<StepperContextValue | undefined>(undefined)
const StepItemContext = createContext<StepItemContextValue | undefined>(
  undefined
)

function useStepper() {
  const ctx = useContext(StepperContext)
  if (!ctx) throw new Error("useStepper must be used within a Stepper")
  return ctx
}

function useStepItem() {
  const ctx = useContext(StepItemContext)
  if (!ctx) throw new Error("useStepItem must be used within a StepperItem")
  return ctx
}

interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: number
  value?: number
  onValueChange?: (value: number) => void
  orientation?: StepperOrientation
  indicators?: StepIndicators
}

function Stepper({
  defaultValue = 1,
  value,
  onValueChange,
  orientation = "horizontal",
  className,
  children,
  indicators = {},
  ...props
}: StepperProps) {
  const [activeStep, setActiveStep] = useState(defaultValue)
  const [triggerNodes, setTriggerNodes] = useState<HTMLButtonElement[]>([])

  const baseId = useId()
  const [items, setItems] = useState<Set<string>>(() => new Set())
  const [ids, setIds] = useState<Record<string, string>>({})
  const registerItem = useCallback((token: string) => {
    setItems((previous) => new Set(previous).add(token))
    return () => setItems((previous) => {
      const next = new Set(previous)
      next.delete(token)
      return next
    })
  }, [])
  const registerId = useCallback((kind: "tab" | "panel", step: number, id: string) => {
    const key = `${kind}:${step}`
    setIds((previous) => previous[key] === id ? previous : { ...previous, [key]: id })
    return () => setIds((previous) => {
      if (previous[key] !== id) return previous
      const next = { ...previous }
      delete next[key]
      return next
    })
  }, [])
  const tabId = (step: number) => ids[`tab:${step}`] ?? `${baseId}-tab-${step}`
  const panelId = (step: number) => ids[`panel:${step}`] ?? `${baseId}-panel-${step}`

  const registerTrigger = useCallback((node: HTMLButtonElement | null) => {
    if (!node) return () => {}
    setTriggerNodes((previous) => previous.includes(node) ? previous : [...previous, node])
    return () => setTriggerNodes((previous) => previous.filter((item) => item !== node))
  }, [])

  const handleSetActiveStep = useCallback(
    (step: number) => {
      if (value === undefined) {
        setActiveStep(step)
      }
      onValueChange?.(step)
    },
    [value, onValueChange]
  )

  const currentStep = value ?? activeStep

  const navigable = (node: HTMLButtonElement) =>
    node.isConnected && !node.disabled && node.getAttribute("aria-disabled") !== "true"
  const orderedNodes = () => triggerNodes.filter((node) => node.isConnected).sort((a, b) =>
    a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
  const focusRelative = (currentIdx: number, direction: number) => {
    const nodes = orderedNodes()
    const current = nodes.indexOf(triggerNodes[currentIdx])
    for (let step = 1; step <= nodes.length; step++) {
      const node = nodes[(current + direction * step + nodes.length) % nodes.length]
      if (navigable(node)) { node.focus(); return }
    }
  }
  const focusNext = (currentIdx: number) => focusRelative(currentIdx, 1)
  const focusPrev = (currentIdx: number) => focusRelative(currentIdx, -1)
  const focusFirst = () => orderedNodes().find(navigable)?.focus()
  const focusLast = () => orderedNodes().filter(navigable).at(-1)?.focus()

  // Declared children give SSR a count; registrations cover wrapped/dynamic
  // items after mount without relying on displayName or invoking components.
  const countDeclared = (nodes: React.ReactNode): number => Children.toArray(nodes).reduce<number>((count, child) => {
    if (!isValidElement(child)) return count
    if (child.type === StepperItem) return count + 1
    if (child.type === Stepper) return count
    return count + countDeclared((child as ReactElement<{ children?: React.ReactNode }>).props.children)
  }, 0)
  const contextValue: StepperContextValue = {
    activeStep: currentStep,
    setActiveStep: handleSetActiveStep,
    stepsCount: items.size || countDeclared(children),
    orientation,
    registerTrigger,
    registerItem,
    registerId,
    baseId,
    tabId,
    panelId,
    focusNext,
    focusPrev,
    focusFirst,
    focusLast,
    triggerNodes,
    indicators,
  }

  return (
    <StepperContext.Provider value={contextValue}>
      <div
        role="tablist"
        aria-orientation={orientation}
        data-slot="stepper"
        className={cn("w-full", className)}
        data-orientation={orientation}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  )
}

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number
  completed?: boolean
  disabled?: boolean
  loading?: boolean
}

function StepperItem({
  step,
  completed = false,
  disabled = false,
  loading = false,
  className,
  children,
  ...props
}: StepperItemProps) {
  const { activeStep, registerItem } = useStepper()
  const token = useId()
  useEffect(() => registerItem(token), [registerItem, token])

  const state: StepState =
    completed || step < activeStep
      ? "completed"
      : activeStep === step
        ? "active"
        : "inactive"

  const isLoading = loading && step === activeStep

  return (
    <StepItemContext.Provider
      value={{ step, state, isDisabled: disabled, isLoading }}
    >
      <div
        data-slot="stepper-item"
        className={cn(
          "group/step flex items-center justify-center not-last:flex-1 group-data-[orientation=horizontal]/stepper-nav:flex-row group-data-[orientation=vertical]/stepper-nav:flex-col",
          className
        )}
        data-state={state}
        {...(isLoading ? { "data-loading": true } : {})}
        {...props}
      >
        {children}
      </div>
    </StepItemContext.Provider>
  )
}

type StepperTriggerProps = useRender.ComponentProps<"button">

function StepperTrigger({
  className,
  children,
  tabIndex,
  id: idProp,
  render,
  ...props
}: StepperTriggerProps) {
  const { state, isLoading } = useStepItem()
  const stepperCtx = useStepper()
  const {
    setActiveStep,
    activeStep,
    registerTrigger,
    triggerNodes,
    focusNext,
    focusPrev,
    focusFirst,
    focusLast,
  } = stepperCtx
  const { step, isDisabled } = useStepItem()
  const isSelected = activeStep === step
  const id = idProp ?? `${stepperCtx.baseId}-tab-${step}`
  const panelId = stepperCtx.panelId(step)
  const { registerId } = stepperCtx
  useLayoutEffect(() => registerId("tab", step, id), [registerId, step, id])

  const btnRef = useRef<HTMLButtonElement | null>(null)
  const unregisterRef = useRef<(() => void) | undefined>(undefined)
  const setTriggerRef = useCallback((node: HTMLButtonElement | null) => {
    unregisterRef.current?.()
    btnRef.current = node
    unregisterRef.current = node ? registerTrigger(node) : undefined
  }, [registerTrigger, isDisabled])
  const myIdx = triggerNodes.indexOf(btnRef.current!)
  const activeAvailable = triggerNodes.some((node) => node.isConnected && !node.disabled &&
    node.getAttribute("aria-disabled") !== "true" && node.dataset.stepperStep === String(activeStep))
  const firstAvailable = triggerNodes.filter((node) => node.isConnected && !node.disabled && node.getAttribute("aria-disabled") !== "true")
    .sort((a, b) => a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)[0]
  const isTabStop = isSelected || (!activeAvailable && firstAvailable === btnRef.current)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isDisabled) return
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault()
        if (myIdx !== -1 && focusNext) focusNext(myIdx)
        break
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault()
        if (myIdx !== -1 && focusPrev) focusPrev(myIdx)
        break
      case "Home":
        e.preventDefault()
        if (focusFirst) focusFirst()
        break
      case "End":
        e.preventDefault()
        if (focusLast) focusLast()
        break
      case "Enter":
      case " ":
        e.preventDefault()
        setActiveStep(step)
        break
    }
  }

  const defaultProps = {
    role: "tab",
    id,
    "aria-selected": isSelected,
    "aria-controls": panelId,
    tabIndex: isDisabled ? -1 : typeof tabIndex === "number" ? tabIndex : isTabStop ? 0 : -1,
    "data-slot": "stepper-trigger",
    "data-stepper-step": step,
    "data-state": state,
    "data-loading": isLoading,
    className: cn(
      "focus-visible:border-ring focus-visible:ring-ring/50 inline-flex cursor-pointer items-center outline-none focus-visible:z-10 focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-60",
      "gap-2.5 rounded-full",
      className
    ),
    onClick: () => { if (!isDisabled) setActiveStep(step) },
    onKeyDown: handleKeyDown,
    disabled: isDisabled,
    children,
  }

  return useRender({
    defaultTagName: "button",
    render,
    ref: setTriggerRef,
    props: mergeProps<"button">(defaultProps, props),
  })
}

function StepperIndicator({
  children,
  className,
}: React.ComponentProps<"div">) {
  const { state, isLoading } = useStepItem()
  const { indicators } = useStepper()

  return (
    <div
      data-slot="stepper-indicator"
      data-state={state}
      className={cn(
        "border-background bg-accent text-accent-foreground data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative flex size-6 shrink-0 items-center justify-center overflow-hidden",
        "rounded-full text-xs",
        className
      )}
    >
      <div className="absolute">
        {indicators &&
        ((isLoading && indicators.loading) ||
          (state === "completed" && indicators.completed) ||
          (state === "active" && indicators.active) ||
          (state === "inactive" && indicators.inactive))
          ? (isLoading && indicators.loading) ||
            (state === "completed" && indicators.completed) ||
            (state === "active" && indicators.active) ||
            (state === "inactive" && indicators.inactive)
          : children}
      </div>
    </div>
  )
}

function StepperSeparator({ className }: React.ComponentProps<"div">) {
  const { state } = useStepItem()

  return (
    <div
      data-slot="stepper-separator"
      data-state={state}
      className={cn(
        "bg-muted rounded-sm m-0.5 group-data-[orientation=horizontal]/stepper-nav:h-0.5 group-data-[orientation=horizontal]/stepper-nav:flex-1 group-data-[orientation=vertical]/stepper-nav:h-12 group-data-[orientation=vertical]/stepper-nav:w-0.5",
        className
      )}
    />
  )
}

function StepperTitle({ children, className }: React.ComponentProps<"h3">) {
  const { state } = useStepItem()

  return (
    <h3
      data-slot="stepper-title"
      data-state={state}
      className={cn("text-sm leading-none font-medium", className)}
    >
      {children}
    </h3>
  )
}

function StepperDescription({
  children,
  className,
}: React.ComponentProps<"div">) {
  const { state } = useStepItem()

  return (
    <div
      data-slot="stepper-description"
      data-state={state}
      className={cn("text-muted-foreground text-sm", className)}
    >
      {children}
    </div>
  )
}

function StepperNav({ children, className }: React.ComponentProps<"nav">) {
  const { activeStep, orientation } = useStepper()

  return (
    <nav
      data-slot="stepper-nav"
      data-state={activeStep}
      data-orientation={orientation}
      className={cn(
        "group/stepper-nav inline-flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col",
        className
      )}
    >
      {children}
    </nav>
  )
}

function StepperPanel({ children, className }: React.ComponentProps<"div">) {
  const { activeStep } = useStepper()

  return (
    <div
      data-slot="stepper-panel"
      data-state={activeStep}
      className={cn("w-full", className)}
    >
      {children}
    </div>
  )
}

interface StepperContentProps extends React.ComponentProps<"div"> {
  value: number
  forceMount?: boolean
}

function StepperContent({
  value,
  forceMount,
  children,
  className,
  id: idProp,
  ...props
}: StepperContentProps) {
  const { activeStep, baseId, tabId, registerId } = useStepper()
  const isActive = value === activeStep
  const id = idProp ?? `${baseId}-panel-${value}`
  useLayoutEffect(() => registerId("panel", value, id), [registerId, value, id])

  return (
    <div
      id={id}
      role="tabpanel"
      aria-labelledby={tabId(value)}
      data-slot="stepper-content"
      data-state={activeStep}
      className={cn("w-full", className, !isActive && "hidden")}
      hidden={!isActive}
      {...props}
    >
      {isActive || forceMount ? children : null}
    </div>
  )
}

export {
  useStepper,
  useStepItem,
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperPanel,
  StepperContent,
  StepperNav,
  type StepperProps,
  type StepperItemProps,
  type StepperTriggerProps,
  type StepperContentProps,
}