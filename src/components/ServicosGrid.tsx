import { CircleCheck } from 'lucide-react'
import type { Servico } from '@/db/repositories/servicos'
import { formatarDuracao } from '@/lib/datas'
import { formatBRL } from '@/lib/money'
import { precoPorTipo, type TipoVeiculo } from '@/lib/ordem'
import { cn } from '@/lib/utils'

/** Serviços em cartões clicáveis, com o preço do tipo de veículo (usado no Novo carro e na Agenda). */
export function ServicosGrid({
  servicos,
  tipo,
  selecionados,
  onAlternar,
  colunas = 2,
}: {
  servicos: Servico[]
  tipo: TipoVeiculo
  selecionados: number[]
  onAlternar: (id: number) => void
  colunas?: 1 | 2
}) {
  return (
    <div
      className={cn('grid gap-2.5', colunas === 2 ? 'grid-cols-2' : 'grid-cols-1')}
      role="group"
      aria-label="Serviços"
    >
      {servicos.map((s) => {
        const preco = precoPorTipo(s, tipo)
        const sel = selecionados.includes(s.id)
        const indisponivel = preco <= 0
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={sel}
            disabled={indisponivel}
            onClick={() => onAlternar(s.id)}
            className={cn(
              cn(colunas === 2 ? 'min-h-[84px]' : 'min-h-[64px]'),
              'relative flex flex-col items-start justify-between gap-2 rounded-[14px] border p-3.5 text-left transition-all duration-150',
              sel
                ? 'border-primary bg-primary-tint'
                : 'border-border bg-surface-2 hover:border-border-strong',
              indisponivel && 'cursor-not-allowed opacity-40',
            )}
          >
            <span className="pr-6 text-[15px] leading-tight font-semibold">{s.nome}</span>
            <span className="flex w-full items-baseline justify-between gap-2">
              <span className={cn('font-display text-base font-semibold', sel && 'text-primary')}>
                {indisponivel ? 'Indisponível' : formatBRL(preco)}
              </span>
              <span className="text-muted text-xs">{formatarDuracao(s.duracao_min)}</span>
            </span>
            <span
              className={cn(
                'absolute top-3 right-3 flex size-5 items-center justify-center rounded-full border transition-colors',
                sel ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong',
              )}
              aria-hidden
            >
              {sel && <CircleCheck className="size-5" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
