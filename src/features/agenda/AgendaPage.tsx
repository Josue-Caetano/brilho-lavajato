import { addDays, format, parseISO } from 'date-fns'
import { CalendarDays, CalendarX2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useConfig } from '@/app/queries'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PlateChip } from '@/components/PlateChip'
import { EmptyState, Segmented, Skeleton } from '@/components/ui/misc'
import { CONFIG_PADRAO } from '@/db/repositories/configuracoes'
import type { Agendamento } from '@/db/repositories/agendamentos'
import { useAgora } from '@/hooks/useAgora'
import {
  diaFechado,
  diasDaSemana,
  gerarHorarios,
  ocupaVaga,
  paraMinutos,
  STATUS_AGENDAMENTO,
} from '@/lib/agenda'
import { hojeIso } from '@/lib/datas'
import { formatBRL } from '@/lib/money'
import { cn, sum } from '@/lib/utils'
import { useEhDono } from '@/stores/sessao'
import { useUi } from '@/stores/ui'
import { AgendamentoCard } from './AgendamentoCard'
import { horaDe, useAgendamentos } from './comum'

type Visao = 'dia' | 'semana'

const COR_STATUS: Record<Agendamento['status'], string> = {
  agendado: 'bg-muted',
  confirmado: 'bg-primary',
  chegou: 'bg-success',
  cancelado: 'bg-danger',
  faltou: 'bg-warning',
}

export default function AgendaPage() {
  const agora = useAgora(30_000)
  const hoje = hojeIso(agora)
  const [dia, setDia] = useState(hoje)
  const [visao, setVisao] = useState<Visao>('dia')
  const semana = diasDaSemana(dia)
  const inicio = visao === 'dia' ? dia : semana[0]!
  const fim = visao === 'dia' ? dia : semana[6]!
  const { data, isLoading } = useAgendamentos(inicio, fim)
  const abrir = useUi((s) => s.abrirAgendamento)

  const andar = (n: number) =>
    setDia((d) => format(addDays(parseISO(`${d}T12:00:00`), n * (visao === 'dia' ? 1 : 7)), 'yyyy-MM-dd'))
  const titulo =
    visao === 'dia'
      ? format(parseISO(`${dia}T12:00:00`), "EEEE, d 'de' MMMM")
      : `${format(parseISO(`${semana[0]}T12:00:00`), "d 'de' MMM")} a ${format(parseISO(`${semana[6]}T12:00:00`), "d 'de' MMM")}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={visao === 'dia' ? 'Dia anterior' : 'Semana anterior'}
            onClick={() => andar(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button variant="secondary" onClick={() => setDia(hoje)} disabled={dia === hoje}>
            Hoje
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={visao === 'dia' ? 'Próximo dia' : 'Próxima semana'}
            onClick={() => andar(1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <h2 className="font-display text-xl font-semibold first-letter:uppercase">{titulo}</h2>
        <Segmented
          aria-label="Visualização"
          className="ml-auto"
          value={visao}
          onChange={setVisao}
          options={[
            { value: 'dia', label: 'Dia' },
            { value: 'semana', label: 'Semana' },
          ]}
        />
        <Button variant="primary" onClick={() => abrir({ data: dia >= hoje ? dia : hoje })}>
          <Plus /> Novo agendamento
        </Button>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-[480px] w-full rounded-[var(--radius-card)]" />
      ) : visao === 'dia' ? (
        <VisaoDia dia={dia} ags={data} agora={agora} />
      ) : (
        <VisaoSemana
          dias={semana}
          ags={data}
          agora={agora}
          onDia={(d) => {
            setDia(d)
            setVisao('dia')
          }}
        />
      )}
    </div>
  )
}

function VisaoDia({ dia, ags, agora }: { dia: string; ags: Agendamento[]; agora: Date }) {
  const { data: cfg } = useConfig()
  const regras = cfg?.agenda ?? CONFIG_PADRAO.agenda
  const ehDono = useEhDono()
  const abrir = useUi((s) => s.abrirAgendamento)
  const hoje = hojeIso(agora)
  const fechado = diaFechado(dia, regras)
  const horarios = gerarHorarios(regras)
  // Agendamentos fora do expediente (encaixes) também aparecem, no horário mais próximo
  const slotDe = (a: Agendamento) => {
    const m = paraMinutos(horaDe(a.data_hora))
    return [...horarios].reverse().find((h) => paraMinutos(h) <= m) ?? horarios[0]!
  }
  const ativos = ags.filter((a) => ocupaVaga(a.status))
  const minAgora = agora.getHours() * 60 + agora.getMinutes()
  // Ao abrir o dia de hoje, rola até o horário atual (uma vez)
  const rolou = useRef(false)
  const rolarAte = (el: HTMLLIElement | null) => {
    if (el && !rolou.current) {
      rolou.current = true
      el.scrollIntoView({ block: 'center' })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <Card className="overflow-hidden">
        {fechado && ags.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            titulo="Fechado neste dia"
            descricao="Os dias de funcionamento ficam em Configurações → Agenda."
          />
        ) : (
          <ol className="flex flex-col">
            {horarios.map((h) => {
              const doSlot = ags.filter((a) => slotDe(a) === h)
              const ocupados = doSlot.filter((a) => ocupaVaga(a.status)).length
              const passado = dia < hoje || (dia === hoje && paraMinutos(h) + regras.intervaloMin <= minAgora)
              const agoraAqui =
                dia === hoje && paraMinutos(h) <= minAgora && minAgora < paraMinutos(h) + regras.intervaloMin
              return (
                <li
                  key={h}
                  ref={agoraAqui ? rolarAte : undefined}
                  className={cn(
                    'border-border grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-b px-4 last:border-0',
                    doSlot.length || !passado ? 'py-2' : 'py-0.5',
                    agoraAqui && 'bg-primary-tint',
                  )}
                >
                  <span
                    className={cn(
                      'font-display text-sm font-semibold tabular-nums',
                      doSlot.length || !passado ? 'pt-2' : 'py-1 text-xs',
                      passado ? 'text-muted/60' : agoraAqui ? 'text-primary' : 'text-muted',
                    )}
                  >
                    {h}
                  </span>
                  <div
                    className={cn(
                      'grid grid-cols-1 items-start gap-2 lg:grid-cols-2 2xl:grid-cols-3',
                      (doSlot.length || !passado) && 'min-h-11',
                    )}
                  >
                    {doSlot.map((a) => (
                      <AgendamentoCard key={a.id} a={a} agora={agora} />
                    ))}
                    {!passado && !fechado && ocupados < regras.vagas && (
                      <button
                        type="button"
                        onClick={() => abrir({ data: dia, hora: h })}
                        className="group text-muted/0 hover:border-border-strong hover:text-muted focus-visible:border-border-strong focus-visible:text-muted flex h-11 items-center gap-2 rounded-[12px] border border-dashed border-transparent px-3 text-sm transition-colors"
                        aria-label={`Agendar às ${h}`}
                      >
                        <Plus className="size-4" /> Agendar às {h}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-5">
          <span className="text-muted text-sm font-medium">Resumo do dia</span>
          <dl className="grid grid-cols-2 gap-3">
            {(
              [
                ['Esperados', ags.filter((a) => a.status === 'agendado' || a.status === 'confirmado').length],
                ['Confirmados', ags.filter((a) => a.status === 'confirmado').length],
                ['Chegaram', ags.filter((a) => a.status === 'chegou').length],
                ['Faltaram', ags.filter((a) => a.status === 'faltou').length],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="bg-surface-2 rounded-xl p-3">
                <dt className="text-muted text-xs">{k}</dt>
                <dd className="font-display text-2xl font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          {ehDono && (
            <p className="text-muted text-sm">
              Previsto: <strong className="text-text">{formatBRL(sum(ativos.map((a) => a.total)))}</strong>
            </p>
          )}
        </Card>
        <Card className="text-muted p-5 text-sm">
          <p className="text-text mb-1 font-semibold">Como funciona</p>
          Passe o mouse num horário livre para agendar. Quando o cliente chegar, clique em{' '}
          <strong>Chegou → fila</strong>: o cadastro e a ordem são criados na hora. O botão verde manda a
          confirmação (ou o lembrete, no dia) pelo WhatsApp.
        </Card>
      </div>
    </div>
  )
}

function VisaoSemana({
  dias,
  ags,
  agora,
  onDia,
}: {
  dias: string[]
  ags: Agendamento[]
  agora: Date
  onDia: (d: string) => void
}) {
  const { data: cfg } = useConfig()
  const regras = cfg?.agenda ?? CONFIG_PADRAO.agenda
  const hoje = hojeIso(agora)
  return (
    <div className="grid grid-cols-7 gap-3">
      {dias.map((d) => {
        const doDia = ags.filter((a) => a.data_hora.startsWith(d))
        const esperados = doDia.filter((a) => ocupaVaga(a.status)).length
        const fechado = diaFechado(d, regras)
        return (
          <section
            key={d}
            aria-label={format(parseISO(`${d}T12:00:00`), "EEEE, d 'de' MMMM")}
            className={cn(
              'bg-sidebar flex min-h-[420px] flex-col rounded-[var(--radius-card)] border',
              d === hoje ? 'border-primary/60' : 'border-border',
              fechado && 'opacity-60',
            )}
          >
            <button
              type="button"
              onClick={() => onDia(d)}
              className="hover:bg-surface-2 flex items-baseline justify-between gap-2 rounded-t-[var(--radius-card)] px-3 pt-3 pb-2 text-left"
            >
              <span>
                <span className="text-muted block text-xs uppercase">
                  {format(parseISO(`${d}T12:00:00`), 'EEE').replace('.', '')}
                </span>
                <span className={cn('font-display text-xl font-bold', d === hoje && 'text-primary')}>
                  {format(parseISO(`${d}T12:00:00`), 'dd')}
                </span>
              </span>
              <span className="text-muted text-xs">
                {fechado ? 'Fechado' : `${esperados} ${esperados === 1 ? 'horário' : 'horários'}`}
              </span>
            </button>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {doDia.length === 0 && !fechado && (
                <p className="text-muted mt-6 flex flex-col items-center gap-1 text-center text-xs">
                  <CalendarDays className="size-4" /> Livre
                </p>
              )}
              {doDia.map((a) => {
                const st = STATUS_AGENDAMENTO[a.status]
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onDia(d)}
                    className={cn(
                      'border-border bg-surface hover:border-border-strong flex flex-col gap-1 rounded-[12px] border p-2.5 text-left transition-colors',
                      !ocupaVaga(a.status) && 'opacity-50',
                    )}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="font-display text-sm font-semibold tabular-nums">
                        {horaDe(a.data_hora)}
                      </span>
                      <span className="text-muted flex items-center gap-1 text-[11px]" title={st.label}>
                        <span className={cn('size-2 rounded-full', COR_STATUS[a.status])} aria-hidden />
                        <span className="sr-only">{st.label}</span>
                      </span>
                    </span>
                    <span className="truncate text-sm font-medium">{a.nome}</span>
                    {a.placa && <PlateChip placa={a.placa} size="sm" className="self-start" />}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
