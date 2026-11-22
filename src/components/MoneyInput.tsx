import * as React from 'react'
import { maskMoneyInput } from '@/lib/money'
import { cn } from '@/lib/utils'
import { inputClass } from './ui/input'

/** Campo de valor em reais. Recebe e devolve centavos; digitação no estilo caixa registradora. */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
    value: number
    onValueChange: (centavos: number) => void
  }
>(({ value, onValueChange, className, ...props }, ref) => (
  <div className="relative">
    <span className="text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px]">
      R$
    </span>
    <input
      ref={ref}
      inputMode="numeric"
      className={cn(inputClass, 'pl-10 text-right font-medium tabular-nums', className)}
      value={maskMoneyInput(String(Math.max(0, Math.round(value || 0))))}
      onChange={(e) => onValueChange(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
      onFocus={(e) => e.currentTarget.select()}
      {...props}
    />
  </div>
))
MoneyInput.displayName = 'MoneyInput'
