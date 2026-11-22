/** Fidelidade: "a cada N lavagens, 1 grátis". Calculada a partir das ordens entregues. */

export interface RegraFidelidade {
  ativo: boolean
  lavagens: number
}

export interface ProgressoFidelidade {
  /** Lavagens acumuladas no ciclo atual (0..N). */
  atual: number
  meta: number
  faltam: number
  premioDisponivel: boolean
}

/**
 * @param pagas ordens entregues que não foram cortesia
 * @param cortesias lavagens grátis já usadas
 */
export function progressoFidelidade(
  pagas: number,
  cortesias: number,
  regra: RegraFidelidade,
): ProgressoFidelidade {
  const meta = Math.max(1, Math.floor(regra.lavagens))
  if (!regra.ativo) return { atual: 0, meta, faltam: meta, premioDisponivel: false }
  const atual = Math.min(meta, Math.max(0, pagas - meta * cortesias))
  return { atual, meta, faltam: meta - atual, premioDisponivel: atual >= meta }
}

/** O cliente está a uma lavagem do prêmio? */
export function quasePremio(p: ProgressoFidelidade): boolean {
  return p.faltam === 1
}
