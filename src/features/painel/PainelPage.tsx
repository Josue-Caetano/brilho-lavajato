import { useQuery } from '@tanstack/react-query'
import { addDays, format, parseISO } from 'date-fns'
import {
  CalendarDays,
  Cake,
  Car,
  Clock,
  Gift,
  Lock,
  MessageCircle,
  Receipt,
  TrendingDown,
  TrendingUp,
  UserRoundX,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { qk, useConfig } from '@/app/queries'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { ChartTooltip, eixo } from '@/components/charts/ChartTooltip'
import { PlateChip } from '@/components/PlateChip'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, EmptyState, Progress, Skeleton } from '@/components/ui/misc'
import { getDb } from '@/db'
import {
  faturamentoPorDia,
  inicioDoMes,
  kpisDoDia,
  rankingServicos,
  resumoClientes,
  selecionarAniversariantes,
  selecionarQuasePremio,
  selecionarSumidos,
} from '@/db/repositories/painel'
import { useAgora } from '@/hooks/useAgora'
import { formatarDuracao, hojeIso } from '@/lib/datas'
import { esperaMedia } from '@/lib/fila'
import { formatBRL, formatBRLCompact } from '@/lib/money'
import { abrirLink } from '@/lib/plataforma'
import { cn } from '@/lib/utils'
import { linkWhatsApp, preencherModelo, primeiroNome } from '@/lib/whatsapp'
import { horaDe, useAgendamentos } from '@/features/agenda/comum'
import { ocupaVaga, STATUS_AGENDAMENTO } from '@/lib/agenda'
import { useEhDono } from '@/stores/sessao'
import { useUi } from '@/stores/ui'

export default function PainelPage() {
  const ehDono = useEhDono()
  const agora = useAgora(60_000)
  const hoje = hojeIso(agora)
  const { data: cfg } = useConfig()

  const kpis = useQuery({
    queryKey: [...qk.ordens, 'kpis', hoje],
    queryFn: async () => kpisDoDia(await getDb(), agora),
  })
  const semana = useQuery({
    queryKey: [...qk.ordens, 'semana', hoje],
    queryFn: async () => faturamentoPorDia(await getDb(), hojeIso(addDays(agora, -6)), hoje),
  })
  const ranking = useQuery({
    queryKey: [...qk.ordens, 'ranking-mes', hoje],
    queryFn: async () => rankingServicos(await getDb(), inicioDoMes(agora), hoje, 5),
  })
  const clientes = useQuery({
    queryKey: [...qk.clientes, 'resumo', ...qk.ordens],
    queryFn: async () => resumoClientes(await getDb()),
  })

  const k = kpis.data
  const variacao =
    k && k.faturamentoSemanaPassada > 0
      ? ((k.faturamento - k.faturamentoSemanaPassada) / k.faturamentoSemanaPassada) * 100
      : null
  const diaSemana = format(agora, 'EEEE')
  const meta = cfg?.metaDiaria ?? 20

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi
          titulo="Faturamento de hoje"
          icon={Wallet}
          carregando={!k}
          bloqueado={!ehDono}
          valor={k && <AnimatedNumber value={k.faturamento} format={formatBRL} />}
          rodape={
            variacao === null ? (
              <span>Sem movimento no último(a) {diaSemana}</span>
            ) : (
              <span
                className={cn('flex items-center gap-1', variacao >= 0 ? 'text-success' : 'text-warning')}
              >
                {variacao >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                {variacao >= 0 ? '+' : ''}
                {variacao.toFixed(0)}%<span className="text-muted">vs. {diaSemana} passado</span>
              </span>
            )
          }
        />
        <Kpi
          titulo="Carros atendidos"
          icon={Car}
          carregando={!k}
          valor={
            k && (
              <span>
                <AnimatedNumber value={k.atendidos} />
                <span className="text-muted text-lg font-semibold"> / {meta}</span>
              </span>
            )
          }
          rodape={
            k && (
              <div className="flex w-full items-center gap-3">
                <Progress
                  value={k.atendidos}
                  max={meta}
                  tone={k.atendidos >= meta ? 'success' : 'primary'}
                  label="Progresso da meta diária"
                />
                <span className="text-xs whitespace-nowrap">
                  {k.atendidos >= meta
                    ? 'Meta batida!'
                    : `${Math.round((k.atendidos / meta) * 100)}% da meta`}
                </span>
              </div>
            )
          }
        />
        <Kpi
          titulo="Ticket médio"
          icon={Receipt}
          carregando={!k}
          bloqueado={!ehDono}
          valor={k && <AnimatedNumber value={k.ticketMedio} format={formatBRL} />}
          rodape={<span>por carro entregue hoje</span>}
        />
        <Kpi
          titulo="Na fila agora"
          icon={Clock}
          carregando={!k}
          valor={k && <AnimatedNumber value={k.naFila} />}
          rodape={
            k && (
              <span>
                {k.naFila > 0
                  ? `Espera média de ${formatarDuracao(esperaMedia(k.entradasFila, agora))}`
                  : 'Fila vazia'}
              </span>
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{ehDono ? 'Faturamento dos últimos 7 dias' : 'Carros nos últimos 7 dias'}</CardTitle>
              <CardDescription>Hoje em destaque</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[240px] pt-2 pb-4">
            {semana.data ? (
              <GraficoSemana dados={semana.data} hoje={hoje} financeiro={ehDono} />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Serviços mais vendidos</CardTitle>
              <CardDescription className="first-letter:uppercase">{format(agora, 'MMMM')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {ranking.data ? (
              ranking.data.length ? (
                <RankingBarras itens={ranking.data} financeiro={ehDono} />
              ) : (
                <EmptyState compacto icon={Receipt} titulo="Nenhum serviço entregue este mês" />
              )
            ) : (
              <Skeleton className="h-44 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        <AgendaHoje hoje={hoje} />
        <ClientesSumidos clientes={clientes.data} agora={agora} />
        <Fidelidade clientes={clientes.data} agora={agora} />
      </div>
    </div>
  )
}

function Kpi({
  titulo,
  icon: Icon,
  valor,
  rodape,
  carregando,
  bloqueado,
}: {
  titulo: string
  icon: React.ComponentType<{ className?: string }>
  valor: React.ReactNode
  rodape?: React.ReactNode
  carregando?: boolean
  bloqueado?: boolean
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-muted text-sm font-medium">{titulo}</span>
        <span className="bg-primary-tint text-primary flex size-9 items-center justify-center rounded-xl">
          <Icon className="size-[18px]" />
        </span>
      </div>
      {bloqueado ? (
        <div className="flex flex-1 flex-col justify-end gap-1">
          <span className="font-display text-muted/50 flex items-center gap-2 text-[28px] font-bold">
            <Lock className="size-5" /> ••••
          </span>
          <span className="text-muted text-sm">Visível apenas para o dono</span>
        </div>
      ) : carregando ? (
        <>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-40" />
        </>
      ) : (
        <>
          <div className="font-display text-[30px] leading-none font-bold tracking-tight tabular-nums">
            {valor}
          </div>
          <div className="text-muted flex min-h-5 items-center text-sm">{rodape}</div>
        </>
      )}
    </Card>
  )
}

function GraficoSemana({
  dados,
  hoje,
  financeiro,
}: {
  dados: { dia: string; faturamento: number; carros: number }[]
  hoje: string
  financeiro: boolean
}) {
  const chave = financeiro ? 'faturamento' : 'carros'
  const fmt = (v: number) => (financeiro ? formatBRL(v) : `${v} ${v === 1 ? 'carro' : 'carros'}`)
  const pontos = dados.map((d) => ({ ...d, rotulo: format(parseISO(d.dia), 'EEE dd'), hoje: d.dia === hoje }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={pontos} margin={{ top: 24, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="rotulo"
          tickLine={false}
          axisLine={false}
          tick={eixo}
          tickFormatter={(v: string) => (v.charAt(0).toUpperCase() + v.slice(1)).replace('.', '')}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={eixo}
          width={financeiro ? 64 : 32}
          tickFormatter={(v: number) => (financeiro ? formatBRLCompact(v) : String(v))}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)', radius: 6 }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as (typeof pontos)[number] | undefined
            return (
              <ChartTooltip
                active={active}
                titulo={p && format(parseISO(p.dia), 'EEEE, dd/MM')}
                linhas={
                  p
                    ? [
                        ...(financeiro ? [{ rotulo: 'Faturamento', valor: formatBRL(p.faturamento) }] : []),
                        { rotulo: 'Carros', valor: String(p.carros) },
                      ]
                    : []
                }
              />
            )
          }}
        />
        <Bar dataKey={chave} radius={[4, 4, 0, 0]} maxBarSize={44} animationDuration={500}>
          {pontos.map((p) => (
            <Cell key={p.dia} fill="var(--primary)" fillOpacity={p.hoje ? 1 : 0.32} />
          ))}
          <LabelList
            dataKey={chave}
            position="top"
            content={({ x, y, width, value, index }) =>
              index === pontos.length - 1 ? (
                <text
                  x={Number(x) + Number(width) / 2}
                  y={Number(y) - 8}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--text)"
                >
                  {fmt(Number(value))}
                </text>
              ) : null
            }
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function RankingBarras({
  itens,
  financeiro,
}: {
  itens: { nome: string; quantidade: number; receita: number }[]
  financeiro: boolean
}) {
  const max = Math.max(...itens.map((i) => i.quantidade), 1)
  return (
    <ol className="flex flex-col gap-3.5">
      {itens.map((i, idx) => (
        <li
          key={i.nome}
          className="flex flex-col gap-1.5"
          title={financeiro ? formatBRL(i.receita) : undefined}
        >
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">
              <span className="text-muted mr-1.5 tabular-nums">{idx + 1}.</span>
              {i.nome}
            </span>
            <span className="text-muted shrink-0 tabular-nums">
              <span className="text-text font-semibold">{i.quantidade}</span>
              {financeiro && <span> · {formatBRLCompact(i.receita)}</span>}
            </span>
          </div>
          <div className="bg-surface-2 h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full origin-left animate-[grow_600ms_ease-out] rounded-full"
              style={{ width: `${(i.quantidade / max) * 100}%`, opacity: 1 - idx * 0.14 }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}

type Resumo = Awaited<ReturnType<typeof resumoClientes>>

function chamarWhatsApp(telefone: string | null, mensagem: string) {
  const url = linkWhatsApp(telefone, mensagem)
  if (!url) return toast.error('Cliente sem telefone cadastrado.')
  void abrirLink(url).catch(() => toast.error('Não foi possível abrir o WhatsApp. Verifique a internet.'))
}

function ClientesSumidos({ clientes, agora }: { clientes?: Resumo; agora: Date }) {
  const { data: cfg } = useConfig()
  const dias = cfg?.diasSumido ?? 30
  const lista = clientes ? selecionarSumidos(clientes, dias, agora) : undefined
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Clientes sumidos</CardTitle>
          <CardDescription>Não voltam há mais de {dias} dias</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!lista ? (
          <Skeleton className="h-40 w-full" />
        ) : lista.length === 0 ? (
          <EmptyState
            compacto
            icon={UserRoundX}
            titulo="Ninguém sumido"
            descricao="Todos os clientes voltaram dentro do prazo. Ótimo sinal!"
          />
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {lista.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.nome}</p>
                  <p className="text-muted flex items-center gap-2 text-sm">
                    {c.placa && <PlateChip placa={c.placa} size="sm" />}
                    <span className="text-warning">há {c.diasSemVir} dias</span>
                  </p>
                </div>
                <Button
                  variant="whatsapp"
                  size="sm"
                  disabled={!c.telefone}
                  onClick={() =>
                    chamarWhatsApp(
                      c.telefone,
                      preencherModelo(cfg?.mensagens.sumido ?? '', {
                        nome: primeiroNome(c.nome),
                        modelo: c.modelo ?? 'carro',
                        placa: c.placa ?? '',
                        empresa: cfg?.empresa.nome,
                      }),
                    )
                  }
                >
                  <MessageCircle /> Chamar no WhatsApp
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function Fidelidade({ clientes, agora }: { clientes?: Resumo; agora: Date }) {
  const { data: cfg } = useConfig()
  const regra = cfg?.fidelidade ?? { ativo: false, lavagens: 10 }
  const quase = clientes ? selecionarQuasePremio(clientes, regra).slice(0, 5) : undefined
  const aniversariantes = clientes ? selecionarAniversariantes(clientes, agora, 7) : undefined
  const vazio = quase?.length === 0 && aniversariantes?.length === 0
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Aniversariantes e fidelidade</CardTitle>
          <CardDescription>
            {regra.ativo
              ? `A 1 lavagem do prêmio (a cada ${regra.lavagens}, 1 grátis)`
              : 'Fidelidade desativada'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!quase || !aniversariantes ? (
          <Skeleton className="h-40 w-full" />
        ) : vazio ? (
          <EmptyState
            compacto
            icon={Gift}
            titulo="Nenhum cliente perto do prêmio"
            descricao="Quem estiver a uma lavagem da cortesia aparece aqui."
          />
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {aniversariantes.map((c) => (
              <li key={`a${c.id}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="bg-warning-tint text-warning flex size-9 shrink-0 items-center justify-center rounded-full">
                  <Cake className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.nome}</p>
                  <p className="text-muted text-sm">
                    {c.emDias === 0
                      ? 'Aniversário hoje!'
                      : c.emDias === 1
                        ? 'Aniversário amanhã'
                        : `Aniversário em ${c.emDias} dias`}
                  </p>
                </div>
                <Button
                  variant="whatsapp"
                  size="sm"
                  disabled={!c.telefone}
                  onClick={() =>
                    chamarWhatsApp(
                      c.telefone,
                      `Feliz aniversário, ${primeiroNome(c.nome)}! A equipe ${cfg?.empresa.nome ?? ''} deseja um ótimo dia.`,
                    )
                  }
                >
                  <MessageCircle /> Parabenizar
                </Button>
              </li>
            ))}
            {quase.map((c) => (
              <li key={`f${c.id}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="bg-success-tint text-success flex size-9 shrink-0 items-center justify-center rounded-full">
                  <Gift className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.nome}</p>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={c.fid.atual}
                      max={c.fid.meta}
                      tone="success"
                      className="max-w-32"
                      label="Fidelidade"
                    />
                    <span className="text-muted text-sm tabular-nums">
                      {c.fid.premioDisponivel ? 'Prêmio liberado' : `${c.fid.atual}/${c.fid.meta}`}
                    </span>
                  </div>
                </div>
                <Button
                  variant="whatsapp"
                  size="sm"
                  disabled={!c.telefone}
                  onClick={() =>
                    chamarWhatsApp(
                      c.telefone,
                      preencherModelo(cfg?.mensagens.fidelidade ?? '', {
                        nome: primeiroNome(c.nome),
                        modelo: c.modelo ?? 'carro',
                        placa: c.placa ?? '',
                        empresa: cfg?.empresa.nome,
                      }),
                    )
                  }
                >
                  <MessageCircle /> Avisar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function AgendaHoje({ hoje }: { hoje: string }) {
  const { data } = useAgendamentos(hoje, hoje)
  const abrir = useUi((s) => s.abrirAgendamento)
  const lista = data?.filter((a) => ocupaVaga(a.status))
  const esperados = lista?.filter((a) => a.status !== 'chegou').length ?? 0
  return (
    <Card className="xl:col-span-2 2xl:col-span-1">
      <CardHeader>
        <div>
          <CardTitle>Agenda de hoje</CardTitle>
          <CardDescription>
            {lista
              ? `${esperados} ${esperados === 1 ? 'cliente esperado' : 'clientes esperados'}`
              : 'Carregando…'}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/agenda">Ver agenda</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!lista ? (
          <Skeleton className="h-40 w-full" />
        ) : lista.length === 0 ? (
          <EmptyState
            compacto
            icon={CalendarDays}
            titulo="Nenhum horário marcado hoje"
            acao={
              <Button size="sm" variant="secondary" onClick={() => abrir({ data: hoje })}>
                Agendar (F3)
              </Button>
            }
          />
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {lista.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="font-display w-12 text-sm font-semibold tabular-nums">
                  {horaDe(a.data_hora)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a.nome}</span>
                  <span className="text-muted block truncate text-sm">
                    {a.servicos.map((s) => s.nome).join(' + ')}
                  </span>
                </span>
                {a.placa && <PlateChip placa={a.placa} size="sm" />}
                <Badge tone={STATUS_AGENDAMENTO[a.status].tom}>{STATUS_AGENDAMENTO[a.status].label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
