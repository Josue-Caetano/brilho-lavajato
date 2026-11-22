import type React from 'react'

/** Em formulários de modal, Enter sempre confirma (exceto em textarea), mesmo com um botão focado. */
export function enterConfirma(enviar: () => void) {
  return (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
    const t = e.target as HTMLElement
    if (t instanceof HTMLTextAreaElement) return
    if (t.closest('[role="listbox"],[role="menu"],[data-radix-select-viewport]')) return
    e.preventDefault()
    enviar()
  }
}
