import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  hideClose,
  size = 'md',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  hideClose?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size]
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="bg-overlay data-[state=open]:animate-fade-in fixed inset-0 z-50 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'border-border bg-surface shadow-pop data-[state=open]:animate-pop-in fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-48px)] w-[calc(100vw-48px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-card)] border outline-none',
          width,
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="text-muted hover:bg-surface-2 hover:text-text absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-[var(--radius-btn)] transition-colors"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 px-6 pt-6 pr-16 pb-2', className)} {...props} />
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-3', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-border flex items-center justify-end gap-3 border-t px-6 py-4', className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('font-display text-xl font-semibold', className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-muted text-sm', className)} {...props} />
}
