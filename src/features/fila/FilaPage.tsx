import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Car, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useConfig } from '@/app/queries'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import type { OrdemFila, StatusFila } from '@/db/repositories/ordens'
import { useAgora } from '@/hooks/useAgora'
import { ETAPAS, etapaAnterior, proximaEtapa, type EtapaFila } from '@/lib/fila'
import { formatBRL } from '@/lib/money'
import { abrirLink } from '@/lib/plataforma'
import { cn } from '@/lib/utils'
import { linkWhatsApp, preencherModelo, primeiroNome } from '@/lib/whatsapp'
import { useUi } from '@/stores/ui'
import { FilaCard } from './FilaCard'
import { useCancelarOrdem, useFila, useMoverOrdem } from './useFila'

const COR_COLUNA: Record<EtapaFila, { dot: string; badge: string }> = {
  aguardando: { dot: 'bg-muted', badge: 'bg-surface-2 text-muted' },
  lavando: { dot: 'bg-primary', badge: 'bg-primary-tint text-primary' },
  acabamento: { dot: 'bg-warning', badge: 'bg-warning-tint text-warning' },
  pronto: { dot: 'bg-success', badge: 'bg-success-tint text-success' },
}

export default function FilaPage() {
  const { data: fila, isLoading } = useFila()
  const { data: cfg } = useConfig()
  const agora = useAgora(30_000)
  const mover = useMoverOrdem()
  const cancelar = useCancelarOrdem()
  const abrirPagamento = useUi((s) => s.abrirPagamento)
  const abrirNovoCarro = useUi((s) => s.abrirNovoCarro)
  const [ativa, setAtiva] = useState<OrdemFila | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const moverPara = (o: OrdemFila, para: StatusFila | null) => {
    if (!para || para === o.status) return
    mover.mutate({ id: o.id, para })
    const titulo = ETAPAS.find((e) => e.status === para)?.titulo
    toast.success(`${o.placa} → ${titulo}`, { duration: 2000 })
  }

  const avisar = (o: OrdemFila) => {
    const msg = preencherModelo(cfg?.mensagens.pronto ?? '', {
      nome: primeiroNome(o.cliente_nome),
      modelo: o.modelo ?? 'carro',
      placa: o.placa,
      total: formatBRL(o.total),
      empresa: cfg?.empresa.nome,
    })
    const url = linkWhatsApp(o.cliente_telefone, msg)
    if (!url) return toast.error('Cliente sem telefone cadastrado.')
    void abrirLink(url).catch(() => toast.error('Não foi possível abrir o WhatsApp. Verifique a internet.'))
  }

  const onDragStart = (e: DragStartEvent) => setAtiva(fila?.find((o) => o.id === e.active.id) ?? null)
  const onDragEnd = (e: DragEndEvent) => {
    setAtiva(null)
    const o = fila?.find((x) => x.id === e.active.id)
    if (o && e.over) moverPara(o, e.over.id as StatusFila)
  }

  if (isLoading) {
    return (
      <div className="grid h-full grid-cols-4 gap-4">
        {ETAPAS.map((e) => (
          <Skeleton key={e.status} className="h-full min-h-96 rounded-[var(--radius-card)]" />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setAtiva(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Pressione espaço para pegar o cartão, use as setas para mover e espaço para soltar.',
        },
      }}
    >
      <div className="grid h-full min-h-[520px] grid-cols-4 gap-3 2xl:gap-4">
        {ETAPAS.map((etapa) => {
          const cards = fila?.filter((o) => o.status === etapa.status) ?? []
          return (
            <Coluna key={etapa.status} status={etapa.status} titulo={etapa.titulo} total={cards.length}>
              {cards.length === 0 ? (
                <ColunaVazia status={etapa.status} onNovo={abrirNovoCarro} />
              ) : (
                cards.map((o) => (
                  <CardArrastavel
                    key={o.id}
                    ordem={o}
                    agora={agora}
                    onAvancar={() => moverPara(o, proximaEtapa(o.status))}
                    onVoltar={() => moverPara(o, etapaAnterior(o.status))}
                    onCancelar={() => cancelar.mutate(o.id)}
                    onAvisar={() => avisar(o)}
                    onCobrar={() => abrirPagamento(o.id)}
                  />
                ))
              )}
            </Coluna>
          )
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' }}>
        {ativa ? <FilaCard ordem={ativa} agora={agora} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Coluna({
  status,
  titulo,
  total,
  children,
}: {
  status: EtapaFila
  titulo: string
  total: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const cor = COR_COLUNA[status]
  return (
    <section
      ref={setNodeRef}
      aria-label={`${titulo}: ${total} carros`}
      className={cn(
        'bg-sidebar flex min-h-0 flex-col rounded-[var(--radius-card)] border transition-colors duration-200',
        isOver ? 'border-primary/60 bg-primary-tint' : 'border-border',
      )}
    >
      <header className="flex items-center gap-2 px-4 pt-4 pb-3">
        <span className={cn('size-2.5 shrink-0 rounded-full', cor.dot)} aria-hidden />
        <h2 className="font-display flex-1 truncate text-sm font-semibold 2xl:text-[15px]" title={titulo}>
          {titulo}
        </h2>
        <span
          className={cn(
            'min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums',
            cor.badge,
          )}
        >
          {total}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">{children}</div>
    </section>
  )
}

function CardArrastavel(props: Omit<React.ComponentProps<typeof FilaCard>, 'arrastando'>) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.ordem.id })
  // Teclas em botões internos (Enter/Espaço) não devem "pegar" o cartão para arrastar.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) listeners?.onKeyDown?.(e)
  }
  return (
    <FilaCard
      ref={setNodeRef}
      arrastando={isDragging}
      className="cursor-grab touch-none active:cursor-grabbing"
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      {...props}
    />
  )
}

function ColunaVazia({ status, onNovo }: { status: EtapaFila; onNovo: () => void }) {
  const textos: Record<EtapaFila, string> = {
    aguardando: 'Nenhum carro esperando.',
    lavando: 'Arraste um carro para cá para começar a lavar.',
    acabamento: 'Carros em secagem e acabamento aparecem aqui.',
    pronto: 'Quando um carro ficar pronto, avise o cliente daqui.',
  }
  return (
    <div className="border-border flex flex-1 flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed px-4 py-10 text-center">
      <Car className="text-muted/60 size-6" />
      <p className="text-muted text-sm">{textos[status]}</p>
      {status === 'aguardando' && (
        <Button size="sm" variant="secondary" onClick={onNovo}>
          <Plus /> Novo carro
        </Button>
      )}
    </div>
  )
}
