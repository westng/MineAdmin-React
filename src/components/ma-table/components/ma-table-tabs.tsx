import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/reui/primitives/badge'
import { Separator } from '@/components/reui/primitives/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/reui/primitives/tabs'
import type { MaTableTabsConfig, MaTableTabValue } from '../types'

interface MaTableTabsProps {
  tabs?: MaTableTabsConfig | ReactNode
  beforeTabs?: ReactNode
  children: ReactNode
}

function ConfiguredTableTabs({
  config,
  beforeTabs,
  children,
}: {
  config: MaTableTabsConfig
  beforeTabs?: ReactNode
  children: ReactNode
}) {
  const [internalValue, setInternalValue] = useState<MaTableTabValue | undefined>(config.defaultValue)
  const enabledItems = config.items.filter(item => !item.disabled)
  const value =
    config.value ?? enabledItems.find(item => item.value === internalValue)?.value ?? enabledItems[0]?.value ?? null

  if (config.items.length === 0)
    return (
      <>
        {beforeTabs}
        {children}
      </>
    )

  return (
    <Tabs
      value={value}
      className="min-w-0 flex-col gap-0"
      onValueChange={nextValue => {
        const item = enabledItems.find(candidate => candidate.value === nextValue)
        if (!item || item.value === value) return
        if (config.value === undefined) setInternalValue(item.value)
        config.onValueChange?.(item.value, item)
      }}
    >
      {beforeTabs}
      <div className="overflow-x-auto border-b px-4">
        <TabsList variant="line" aria-label={config.ariaLabel ?? '表格标签'} className="h-11 justify-start gap-6 p-0">
          {config.items.map(item => (
            <TabsTrigger
              key={`${typeof item.value}:${item.value}`}
              value={item.value}
              disabled={item.disabled}
              className="h-full flex-none gap-2 rounded-none border-0 px-0 py-0 after:inset-x-0 after:bottom-0 after:h-0.5"
            >
              {item.label}
              {item.count !== undefined && (
                <Badge
                  variant={item.value === value ? 'secondary' : 'outline'}
                  radius="full"
                  className="px-1 font-normal tabular-nums"
                >
                  {item.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {value === null ? (
        children
      ) : (
        <TabsContent value={value} keepMounted className="min-w-0">
          {children}
        </TabsContent>
      )}
    </Tabs>
  )
}

export function MaTableTabs({ tabs, beforeTabs, children }: MaTableTabsProps) {
  if (typeof tabs === 'object' && tabs !== null && 'items' in tabs) {
    return (
      <ConfiguredTableTabs config={tabs} beforeTabs={beforeTabs}>
        {children}
      </ConfiguredTableTabs>
    )
  }

  return (
    <>
      {beforeTabs}
      {tabs && (
        <>
          <div className="px-4 pt-3">{tabs}</div>
          <Separator />
        </>
      )}
      {children}
    </>
  )
}
