import { Command as CommandPrimitive } from 'cmdk'
import { Check, Search } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/reui/primitives/dialog'

function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn('flex size-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground', className)}
      {...props}
    />
  )
}

function CommandInput({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="flex h-8 items-center gap-2 border-b px-2">
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
          className,
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-72 overflow-y-auto p-1', className)}
      {...props}
    />
  )
}

function CommandEmpty({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn('py-6 text-center text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function CommandItem({ className, children, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[selected=true]:bg-muted data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <Check className="ml-auto size-4 opacity-0" aria-hidden="true" />
    </CommandPrimitive.Item>
  )
}

function CommandDialog({
  title = '搜索菜单',
  description = '搜索并打开菜单页面',
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Dialog>, 'children'> & {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Dialog {...props}>
      <DialogContent className={cn('h-screen w-screen max-w-none rounded-none p-0', className)}>
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandItem }
