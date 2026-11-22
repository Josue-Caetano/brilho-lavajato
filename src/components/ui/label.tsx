import * as LabelPrimitive from '@radix-ui/react-label'
import * as React from 'react'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('text-text text-sm font-medium', className)} {...props} />
}

/** Rótulo + campo + mensagem de ajuda/erro. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: React.ReactNode
  htmlFor?: string
  error?: string
  hint?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="min-h-6">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-danger text-[13px]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted text-[13px]">{hint}</p>
      ) : null}
    </div>
  )
}
