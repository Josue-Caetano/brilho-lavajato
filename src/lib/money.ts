const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtCompact = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/** 124000 → "R$ 1.240,00". Usa espaço não separável: o valor nunca quebra em duas linhas. */
export function formatBRL(centavos: number): string {
  return fmt.format((centavos || 0) / 100).replace(/\s/g, '\u00a0')
}

/** 124000 → "R$ 1.240" (sem centavos, para eixos de gráfico). */
export function formatBRLCompact(centavos: number): string {
  return `R$\u00a0${fmtCompact.format(Math.round((centavos || 0) / 100))}`
}

/** Converte texto digitado ("1.240,50", "R$ 35", "35.5") em centavos. Retorna null se inválido. */
export function parseBRL(texto: string): number | null {
  if (texto == null) return null
  let s = String(texto)
    .replace(/R\$|\s/g, '')
    .trim()
  if (!s) return null
  const negativo = s.startsWith('-')
  s = s.replace(/^-/, '')
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if ((s.match(/\./g) ?? []).length > 1 || /\.\d{3}$/.test(s)) {
    // "1.240" ou "1.240.000" → separador de milhar
    s = s.replace(/\./g, '')
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const v = Math.round(parseFloat(s) * 100)
  return negativo ? -v : v
}

/** Centavos → texto editável "1240,50" (para preencher inputs). */
export function centsToInput(centavos: number): string {
  return ((centavos || 0) / 100).toFixed(2).replace('.', ',')
}

/** Máscara de digitação estilo caixa registradora: "12345" → "123,45". */
export function maskMoneyInput(texto: string): string {
  const digits = texto.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  const cents = parseInt(digits || '0', 10)
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
