import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { inputClass } from './input'

export interface SelectOption {
  value: string
  label: string
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  className,
  'aria-label': ariaLabel,
  disabled,
}: {
  value: string | undefined
  onValueChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  id?: string
  className?: string
  'aria-label'?: string
  disabled?: boolean
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(inputClass, 'flex items-center justify-between gap-2 text-left', className)}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="text-muted size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="border-border-strong bg-surface shadow-pop data-[state=open]:animate-fade-in z-[70] max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-btn)] border"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className="data-[highlighted]:bg-surface-2 relative flex h-10 cursor-pointer items-center rounded-lg pr-3 pl-8 text-[15px] outline-none select-none"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2">
                  <Check className="text-primary size-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
