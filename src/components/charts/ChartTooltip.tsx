/** Tooltip padrão dos gráficos (recharts): superfície do app, texto nas cores de texto, nunca na cor da série. */
export function ChartTooltip({
  active,
  titulo,
  linhas,
}: {
  active?: boolean
  titulo?: React.ReactNode
  linhas: { cor?: string; rotulo: string; valor: string }[]
}) {
  if (!active) return null
  return (
    <div className="border-border-strong bg-surface shadow-pop rounded-[var(--radius-btn)] border px-3 py-2 text-sm">
      {titulo && <p className="text-text mb-1 font-semibold">{titulo}</p>}
      {linhas.map((l) => (
        <p key={l.rotulo} className="text-muted flex items-center gap-2">
          {l.cor && <span className="size-2.5 rounded-[3px]" style={{ background: l.cor }} aria-hidden />}
          <span>{l.rotulo}</span>
          <span className="text-text ml-auto pl-3 font-semibold tabular-nums">{l.valor}</span>
        </p>
      ))}
    </div>
  )
}

export const eixo = { fontSize: 12, fill: 'var(--text-muted)' }
