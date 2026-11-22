import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { invalidarMovimento, qk } from '@/app/queries'
import { getDb } from '@/db'
import { listarAgendamentos, type Agendamento } from '@/db/repositories/agendamentos'
import type { Configuracoes } from '@/db/repositories/configuracoes'
import { formatBRL } from '@/lib/money'
import { abrirLink } from '@/lib/plataforma'
import { formatarPlaca } from '@/lib/placa'
import { linkWhatsApp, preencherModelo, primeiroNome } from '@/lib/whatsapp'

export const agendaKey = [...qk.ordens, 'agenda'] as const

export function useAgendamentos(inicio: string, fim: string) {
  return useQuery({
    queryKey: [...agendaKey, inicio, fim],
    queryFn: async () => listarAgendamentos(await getDb(), inicio, fim),
  })
}

export const recarregarAgenda = () => invalidarMovimento()

export const horaDe = (iso: string) => iso.slice(11, 16)

export function horaFim(a: Pick<Agendamento, 'data_hora' | 'duracao_min'>): string {
  const d = parseISO(a.data_hora)
  return format(new Date(d.getTime() + a.duracao_min * 60_000), 'HH:mm')
}

/** Abre o WhatsApp com a confirmação (ou o lembrete, se for hoje) do agendamento. */
export function avisarAgendamento(
  a: Agendamento,
  cfg: Configuracoes | undefined,
  tipo: 'agendamento' | 'lembrete',
) {
  const msg = preencherModelo(cfg?.mensagens[tipo] ?? '', {
    nome: primeiroNome(a.nome),
    modelo: a.modelo ?? 'carro',
    placa: a.placa ? formatarPlaca(a.placa) : '',
    total: formatBRL(a.total),
    empresa: cfg?.empresa.nome,
    data: format(parseISO(a.data_hora), 'dd/MM'),
    hora: horaDe(a.data_hora),
    servicos: a.servicos.map((s) => s.nome).join(' + '),
  })
  const url = linkWhatsApp(a.telefone, msg)
  if (!url) return toast.error('Agendamento sem telefone.')
  void abrirLink(url).catch(() => toast.error('Não foi possível abrir o WhatsApp. Verifique a internet.'))
}
