import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowRight, Ban, Clock, Ellipsis, MessageCircle, Receipt, Undo2 } from 'lucide-react'
import { forwardRef } from 'react'
import { PlateChip } from '@/components/PlateChip'
import { Button } from '@/components/ui/button'
import { confirmar } from '@/components/ui/confirm'
import type { OrdemFila } from '@/db/repositories/ordens'
import { formatarDuracao } from '@/lib/datas'
import { ETAPAS, etapaAnterior, proximaEtapa, tempoNaEtapa } from '@/lib/fila'
import { formatBRL } from '@/lib/money'
import { cn } from '@/lib/utils'

export interface FilaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  ordem: OrdemFila
  agora: Date
  arrastando?: boolean
  overlay?: boolean
  onAvancar?: () => void
  onVoltar?: () => void
  onCancelar?: () => void
  onAvisar?: () => void
  onCobrar?: () => void
}

export const FilaCard = forwardRef<HTMLDivElement, FilaCardProps>(function FilaCard(
  {
    ordem: o,
    agora,
    arrastando,
    overlay,
    onAvancar,
    onVoltar,
    onCancelar,
    onAvisar,
    onCobrar,
    className,
    ...props
  },
  ref,
) {
  const tempo = tempoNaEtapa(o, agora)
  const etapa = ETAPAS.find((e) => e.status === o.status)!
  const prox = proximaEtapa(o.status)
  const anterior = etapaAnterior(o.status)
  const veiculo = [o.modelo, o.cor].filter(Boolean).join(' · ')

  return (
    <div
      ref={ref}
      className={cn(
        'group bg-surface relative flex flex-col gap-3 rounded-[var(--radius-card)] border p-4 transition-[border-color,box-shadow,opacity,transform] duration-200',
        tempo.atrasado
          ? 'border-warning/70 shadow-[0_0_0_1px_var(--warning)]'
          : 'border-border hover:border-border-strong',
        arrastando && 'opacity-40',
        overlay && 'shadow-pop rotate-[1.5deg] cursor-grabbing',
        !overlay && 'animate-pop-in',
        className,
      )}
      aria-label={`${o.placa}, ${veiculo}, ${o.cliente_nome}, ${etapa.titulo}`}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <PlateChip placa={o.placa} />
        <div className="flex items-center gap-0.5">
          <span
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap tabular-nums',
              tempo.atrasado ? 'bg-warning-tint text-warning' : 'bg-surface-2 text-muted',
            )}
            title={`Nesta etapa há ${formatarDuracao(tempo.minutos)} · previsto ${formatarDuracao(tempo.previsto)}`}
          >
            <Clock className="size-3.5" />
            {formatarDuracao(tempo.minutos)}
          </span>
          {!overlay && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Mais ações para ${o.placa}`}
                  className="text-muted hover:bg-surface-2 hover:text-text inline-flex size-9 items-center justify-center rounded-lg transition-colors"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Ellipsis className="size-[18px]" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="border-border-strong bg-surface shadow-pop data-[state=open]:animate-fade-in z-50 min-w-52 rounded-[var(--radius-btn)] border p-1"
                >
                  {anterior && (
                    <DropdownMenu.Item
                      onSelect={onVoltar}
                      className="data-[highlighted]:bg-surface-2 flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none"
                    >
                      <Undo2 className="size-4" /> Voltar para “
                      {ETAPAS.find((e) => e.status === anterior)?.titulo}”
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Item
                    onSelect={async () => {
                      if (
                        await confirmar({
                          titulo: `Cancelar a ordem de ${o.placa}?`,
                          descricao: 'O carro sai da fila e a ordem não entra no faturamento.',
                          confirmar: 'Cancelar ordem',
                          cancelar: 'Voltar',
                          perigoso: true,
                        })
                      )
                        onCancelar?.()
                    }}
                    className="text-danger data-[highlighted]:bg-danger-tint flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none"
                  >
                    <Ban className="size-4" /> Cancelar ordem
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-[15px] font-semibold">{o.cliente_nome}</p>
        <p className="text-muted truncate text-sm">{veiculo || 'Veículo'}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {o.itens.map((i) => (
          <span key={i.id} className="bg-surface-2 text-muted rounded-md px-2 py-0.5 text-xs font-medium">
            {i.nome}
          </span>
        ))}
      </div>
      {o.cliente_observacoes && (
        <p className="border-warning/25 bg-warning-tint text-warning rounded-lg border px-2.5 py-1.5 text-xs">
          {o.cliente_observacoes}
        </p>
      )}

      <div className="border-border flex items-center justify-between gap-2 border-t pt-3">
        <span className="font-display text-base font-semibold whitespace-nowrap tabular-nums">
          {formatBRL(o.total)}
        </span>
        {tempo.atrasado && <span className="text-warning text-xs font-semibold">Passou do previsto</span>}
      </div>

      {!overlay && (prox || o.status === 'pronto') && (
        <div className="flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
          {prox && etapa.acao && (
            <Button size="md" variant="secondary" className="w-full justify-between" onClick={onAvancar}>
              {etapa.acao} <ArrowRight className="text-primary" />
            </Button>
          )}
          {o.status === 'pronto' && (
            <>
              <Button variant="whatsapp" className="w-full" onClick={onAvisar} disabled={!o.cliente_telefone}>
                <MessageCircle /> Avisar cliente
              </Button>
              <Button variant="primary" className="w-full" onClick={onCobrar}>
                <Receipt /> Entregar e cobrar
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
})
