import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'border-border bg-sidebar inline-flex items-center gap-1 rounded-[14px] border p-1',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'text-muted hover:text-text data-[state=active]:bg-surface-2 data-[state=active]:text-text inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-medium transition-colors duration-150 [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('data-[state=active]:animate-fade-in outline-none', className)}
      {...props}
    />
  )
}
