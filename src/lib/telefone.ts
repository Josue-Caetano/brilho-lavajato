/** Mantém só os dígitos e remove o +55 se vier junto. */
export function normalizarTelefone(texto: string | null | undefined): string {
  let d = (texto ?? '').replace(/\D/g, '')
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  return d.slice(0, 11)
}

/** "11987654321" → "(11) 98765-4321"; "1133334444" → "(11) 3333-4444". Também serve como máscara de digitação. */
export function formatarTelefone(texto: string | null | undefined): string {
  const d = normalizarTelefone(texto)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (resto.length <= 4) return `(${ddd}) ${resto}`
  if (d.length === 11) return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`
  return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`
}

export function telefoneValido(texto: string | null | undefined): boolean {
  const d = normalizarTelefone(texto)
  return d.length === 10 || d.length === 11
}
