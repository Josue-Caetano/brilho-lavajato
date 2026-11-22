import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useMutation } from '@tanstack/react-query'
import { Ban, CircleCheck, Ellipsis, LogIn, MessageCircle, Pencil, UserX } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useConfig } from '@/app/queries'
import { PlateChip } from '@/components/PlateChip'
import { Button } from '@/components/ui/button'
import { confirmar } from '@/components/ui/confirm'
import { Badge } from '@/components/ui/misc'
import { getDb } from '@/db'
import { mudarStatusAgendamento, registrarChegada, type Agendamento } from '@/db/repositories/agendamentos'
import { STATUS_AGENDAMENTO } from '@/lib/agenda'
import { hojeIso, minutosDesde } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { formatBRL } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useEhDono, useSessao } from '@/stores/sessao'
import { useUi } from '@/stores/ui'
import { avisarAgendamento, horaDe, horaFim, recarregarAgenda } from './comum'

const itemMenu =
  'flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-surface-2'

/** Cartão de agendamento com as ações do dia: chegou → fila, WhatsApp, confirmar, faltou, cancelar. */
export function AgendamentoCard({ a, agora }: { a: Agendamento; agora: Date }) {
  const { data: cfg } = useConfig()
  const ehDono = useEhDono()
  const usuario = useSessao((s) => s.usuario)
  const navigate = useNavigate()
  const ativo = a.status === 'agendado' || a.status === 'confirmado'
  const ehHoje = a.data_hora.startsWith(hojeIso(agora))
  const atrasado = ativo && ehHoje && minutosDesde(a.data_hora, agora) > 15
  const st = STATUS_AGENDAMENTO[a.status]

  const chegou = useMutation({
    mutationFn: async () => registrarChegada(await getDb(), a.id, usuario?.id ?? null),
    onSuccess: () => {
      recarregarAgenda()
      toast.success(`${a.nome} chegou — carro na fila`, {
        action: { label: 'Ver fila', onClick: () => navigate('/fila') },
      })
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })
  const mudar = async (status: 'confirmado' | 'faltou' | 'cancelado' | 'agendado') => {
    if (
      status === 'cancelado' &&
      !(await confirmar({
        titulo: `Cancelar o horário de ${a.nome}?`,
        descricao: 'A vaga fica livre para outro cliente.',
        confirmar: 'Cancelar horário',
        cancelar: 'Voltar',
        perigoso: true,
      }))
    )
      return
    try {
      await mudarStatusAgendamento(await getDb(), a.id, status)
      recarregarAgenda()
    } catch (e) {
      toast.error(mensagemErro(e))
    }
  }

  return (
    <article
      className={cn(
        'animate-pop-in bg-surface flex flex-col gap-2.5 rounded-[14px] border p-3.5 transition-colors',
        atrasado ? 'border-warning/70' : 'border-border',
        !ativo && a.status !== 'chegou' && 'opacity-60',
      )}
      aria-label={`${horaDe(a.data_hora)} ${a.nome}, ${st.label}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[15px] font-semibold tabular-nums">
            {horaDe(a.data_hora)}
            <span className="text-muted font-sans text-sm font-normal"> – {horaFim(a)}</span>
          </p>
          <p className="truncate font-semibold">{a.nome}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {atrasado ? <Badge tone="warning">Atrasado</Badge> : <Badge tone={st.tom}>{st.label}</Badge>}
          {a.status !== 'chegou' && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Mais ações para ${a.nome}`}
                  className="text-muted hover:bg-surface-2 hover:text-text inline-flex size-8 items-center justify-center rounded-lg"
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
                  {ativo && (
                    <DropdownMenu.Item
                      className={itemMenu}
                      onSelect={() => useUi.getState().abrirAgendamento({ editar: a })}
                    >
                      <Pencil className="size-4" /> Editar / remarcar
                    </DropdownMenu.Item>
                  )}
                  {a.status === 'agendado' && (
                    <DropdownMenu.Item className={itemMenu} onSelect={() => mudar('confirmado')}>
                      <CircleCheck className="size-4" /> Marcar como confirmado
                    </DropdownMenu.Item>
                  )}
                  {ativo && (
                    <DropdownMenu.Item className={itemMenu} onSelect={() => mudar('faltou')}>
                      <UserX className="size-4" /> Cliente faltou
                    </DropdownMenu.Item>
                  )}
                  {!ativo && (
                    <DropdownMenu.Item className={itemMenu} onSelect={() => mudar('agendado')}>
                      <CircleCheck className="size-4" /> Reativar horário
                    </DropdownMenu.Item>
                  )}
                  {ativo && (
                    <DropdownMenu.Item
                      className={cn(itemMenu, 'text-danger data-[highlighted]:bg-danger-tint')}
                      onSelect={() => mudar('cancelado')}
                    >
                      <Ban className="size-4" /> Cancelar horário
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {a.placa && <PlateChip placa={a.placa} size="sm" />}
        {a.modelo && <span className="text-muted text-sm">{a.modelo}</span>}
      </div>
      <>
        <div className="flex flex-wrap gap-1.5">
          {a.servicos.map((s) => (
            <span
              key={s.servico_id}
              className="bg-surface-2 text-muted rounded-md px-2 py-0.5 text-xs font-medium"
            >
              {s.nome}
            </span>
          ))}
          {ehDono && <span className="ml-auto text-sm font-semibold tabular-nums">{formatBRL(a.total)}</span>}
        </div>
        {a.observacoes && <p className="text-muted text-xs">{a.observacoes}</p>}
      </>

      {ativo && (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => chegou.mutate()}
            loading={chegou.isPending}
          >
            <LogIn /> Chegou → fila
          </Button>
          <Button
            variant="whatsapp"
            size="icon-sm"
            aria-label={ehHoje ? 'Lembrar pelo WhatsApp' : 'Confirmar pelo WhatsApp'}
            title={ehHoje ? 'Lembrar pelo WhatsApp' : 'Confirmar pelo WhatsApp'}
            disabled={!a.telefone}
            onClick={() => avisarAgendamento(a, cfg, ehHoje ? 'lembrete' : 'agendamento')}
          >
            <MessageCircle />
          </Button>
        </div>
      )}
      {a.status === 'chegou' && (
        <Button
          variant="ghost"
          size="sm"
          className="text-success self-start"
          onClick={() => navigate('/fila')}
        >
          <CircleCheck /> Na fila — ver
        </Button>
      )}
    </article>
  )
}
