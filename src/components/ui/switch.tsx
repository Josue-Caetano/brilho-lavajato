import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as React from 'react'
import { cn } from '@/lib/utils'

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer border-border-strong bg-surface-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="bg-text data-[state=checked]:bg-primary-foreground block size-5 rounded-full shadow transition-transform duration-200 data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  )
}
