/** Placas brasileiras: antiga (ABC-1234) e Mercosul (ABC1D23). */

const ANTIGA = /^[A-Z]{3}[0-9]{4}$/
const MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/

/** Remove tudo que não é letra ou número e coloca em maiúsculas: "abc-1d23" → "ABC1D23". */
export function normalizarPlaca(texto: string): string {
  return (texto ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7)
}

export type TipoPlaca = 'antiga' | 'mercosul'

export function tipoPlaca(texto: string): TipoPlaca | null {
  const p = normalizarPlaca(texto)
  if (ANTIGA.test(p)) return 'antiga'
  if (MERCOSUL.test(p)) return 'mercosul'
  return null
}

export function placaValida(texto: string): boolean {
  return tipoPlaca(texto) !== null
}

/**
 * Máscara enquanto digita. Força letras nas 3 primeiras posições e número na 4ª;
 * a 5ª define o padrão (número → antiga com hífen, letra → Mercosul).
 */
export function mascararPlaca(texto: string): string {
  const bruto = (texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  let out = ''
  for (const ch of bruto) {
    const i = out.length
    if (i >= 7) break
    const letra = /[A-Z]/.test(ch)
    if (i < 3 && !letra) continue
    if (i === 3 && letra) continue
    if (i >= 5 && letra) continue
    out += ch
  }
  if (out.length > 4 && /[0-9]/.test(out[4]!)) return `${out.slice(0, 3)}-${out.slice(3)}`
  return out
}

/** Formato de exibição: antiga com hífen, Mercosul sem. */
export function formatarPlaca(texto: string): string {
  const p = normalizarPlaca(texto)
  if (ANTIGA.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`
  return p
}
