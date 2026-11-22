import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as React from 'react'

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="border-border-strong bg-surface-2 text-text shadow-pop data-[state=delayed-open]:animate-fade-in z-[80] max-w-xs rounded-lg border px-3 py-1.5 text-[13px]"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
