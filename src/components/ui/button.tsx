import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-btn)] font-medium transition-[background-color,border-color,color,transform,opacity] duration-150 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground font-semibold hover:brightness-110',
        secondary: 'border border-border-strong bg-surface-2 text-text hover:bg-border',
        outline: 'border border-border-strong bg-transparent text-text hover:bg-surface-2',
        ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-text',
        danger: 'bg-danger text-white font-semibold hover:brightness-110',
        'danger-soft': 'border border-danger/40 bg-danger-tint text-danger hover:bg-danger/20',
        success: 'bg-success text-primary-foreground font-semibold hover:brightness-110',
        whatsapp:
          'border border-whatsapp-border bg-whatsapp-bg text-whatsapp-text hover:brightness-110 font-semibold',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-[15px]',
        lg: 'h-12 px-5 text-base',
        xl: 'h-14 px-6 text-lg',
        icon: 'size-11',
        'icon-sm': 'size-9',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...(!asChild && { type: props.type ?? 'button' })}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <LoaderCircle className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'
