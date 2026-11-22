import * as React from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'h-11 w-full rounded-[var(--radius-btn)] border border-border-strong bg-bg px-3.5 text-[15px] text-text placeholder:text-muted/70 transition-colors duration-150 outline-none focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60 aria-[invalid=true]:border-danger'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputClass, className)} {...props} />,
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(inputClass, 'h-auto min-h-24 py-2.5 leading-relaxed', className)}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
