/** Conferência de fechamento de caixa. Tudo em centavos. */

export type FormaCaixa = 'dinheiro' | 'pix' | 'debito' | 'credito'
export const FORMAS_CAIXA: FormaCaixa[] = ['dinheiro', 'pix', 'debito', 'credito']

export interface MovimentosCaixa {
  valorAbertura: number
  /** Recebimentos (vendas e quitações de fiado) por forma. Dinheiro já líquido de troco. */
  recebido: Record<FormaCaixa, number>
  suprimentos: number
  sangrias: number
  entradas: number
  saidas: number
  /** Despesas pagas com o dinheiro da gaveta. */
  despesasDinheiro: number
}

export function esperadoPorForma(m: MovimentosCaixa): Record<FormaCaixa, number> {
  return {
    dinheiro:
      m.valorAbertura +
      m.recebido.dinheiro +
      m.suprimentos +
      m.entradas -
      m.sangrias -
      m.saidas -
      m.despesasDinheiro,
    pix: m.recebido.pix,
    debito: m.recebido.debito,
    credito: m.recebido.credito,
  }
}

export interface LinhaConferencia {
  forma: FormaCaixa
  esperado: number
  informado: number
  diferenca: number
}

export interface Conferencia {
  linhas: LinhaConferencia[]
  esperadoTotal: number
  informadoTotal: number
  /** Positiva = sobra; negativa = falta. */
  diferenca: number
}

export function conferirCaixa(
  m: MovimentosCaixa,
  informado: Partial<Record<FormaCaixa, number>>,
): Conferencia {
  const esperado = esperadoPorForma(m)
  const linhas = FORMAS_CAIXA.map((forma) => {
    const inf = informado[forma] ?? 0
    return { forma, esperado: esperado[forma], informado: inf, diferenca: inf - esperado[forma] }
  })
  const esperadoTotal = linhas.reduce((a, l) => a + l.esperado, 0)
  const informadoTotal = linhas.reduce((a, l) => a + l.informado, 0)
  return { linhas, esperadoTotal, informadoTotal, diferenca: informadoTotal - esperadoTotal }
}
