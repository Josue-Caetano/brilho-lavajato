import { useMutation, useQuery } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  CreditCard,
  HandCoins,
  History,
  Lock,
  LockOpen,
  QrCode,
  Receipt,
  ShoppingCart,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Fragment, useState } from 'react'
import { toast } from 'sonner'
import { invalidarMovimento, qk } from '@/app/queries'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { confirmar } from '@/components/ui/confirm'
import { Badge, EmptyState, Skeleton } from '@/components/ui/misc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { getDb } from '@/db'
import {
  abrirCaixa,
  excluirDespesa,
  excluirMovimento,
  listarCaixas,
  listarDespesas,
  type Lancamento,
} from '@/db/repositories/caixa'
import { esperadoPorForma, type Conferencia } from '@/lib/caixa'
import { formatarData, formatarDataHora, formatarHora } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { formatBRL } from '@/lib/money'
import { labelForma } from '@/lib/ordem'
import { cn, sum } from '@/lib/utils'
import { useEhDono, useSessao } from '@/stores/sessao'
import { DespesaDialog, Diferenca, FechamentoDialog, MovimentoDialog } from './dialogs'
import { useCaixaAtual } from './useCaixa'

export default function CaixaPage() {
  const ehDono = useEhDono()
  return (
    <Tabs defaultValue="atual" className="flex flex-col gap-5">
      <TabsList className="self-start">
        <TabsTrigger value="atual">
          <Wallet /> Caixa atual
        </TabsTrigger>
        {ehDono && (
          <>
            <TabsTrigger value="despesas">
              <Receipt /> Despesas
            </TabsTrigger>
            <TabsTrigger value="historico">
              <History /> Histórico
            </TabsTrigger>
          </>
        )}
      </TabsList>
      <TabsContent value="atual">
        <CaixaAtual />
      </TabsContent>
      {ehDono && (
        <>
          <TabsContent value="despesas">
            <Despesas />
          </TabsContent>
          <TabsContent value="historico">
            <HistoricoCaixas />
          </TabsContent>
        </>
      )}
    </Tabs>
  )
}

function CaixaAtual() {
  const { data, isLoading } = useCaixaAtual()
  const usuario = useSessao((s) => s.usuario)
  const [abertura, setAbertura] = useState(0)
  const [movimento, setMovimento] = useState<'sangria' | 'suprimento' | null>(null)
  const [despesa, setDespesa] = useState(false)
  const [fechar, setFechar] = useState(false)

  const abrir = useMutation({
    mutationFn: async () => abrirCaixa(await getDb(), abertura, usuario?.id ?? null),
    onSuccess: () => {
      invalidarMovimento()
      toast.success(`Caixa aberto com ${formatBRL(abertura)}.`)
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })

  if (isLoading) return <Skeleton className="h-80 w-full rounded-[var(--radius-card)]" />

  if (!data) {
    return (
      <Card className="mx-auto flex max-w-lg flex-col items-center gap-5 p-10 text-center">
        <span className="bg-primary-tint text-primary flex size-16 items-center justify-center rounded-2xl">
          <Lock className="size-7" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-bold">Caixa fechado</h2>
          <p className="text-muted mt-1">Informe quanto há de troco na gaveta para começar o dia.</p>
        </div>
        <form
          className="flex w-full max-w-sm flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            abrir.mutate()
          }}
        >
          <MoneyInput
            aria-label="Valor inicial do caixa"
            autoFocus
            value={abertura}
            onValueChange={setAbertura}
            className="h-14 text-xl"
          />
          <Button type="submit" variant="primary" size="lg" loading={abrir.isPending}>
            <LockOpen /> Abrir caixa
          </Button>
        </form>
      </Card>
    )
  }

  const { caixa, movimentos, lancamentos, fiadoLancado } = data
  const esperado = esperadoPorForma(movimentos)
  const totalRecebido = sum(Object.values(movimentos.recebido))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="success">
          <LockOpen /> Aberto
        </Badge>
        <span className="text-muted">
          desde {formatarDataHora(caixa.aberto_em)} · troco inicial {formatBRL(caixa.valor_abertura)}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => setMovimento('sangria')}>
            <ArrowUpFromLine /> Sangria
          </Button>
          <Button variant="secondary" onClick={() => setMovimento('suprimento')}>
            <ArrowDownToLine /> Suprimento
          </Button>
          <Button variant="secondary" onClick={() => setDespesa(true)}>
            <ShoppingCart /> Despesa
          </Button>
          <Button variant="primary" onClick={() => setFechar(true)}>
            <Lock /> Fechar caixa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Tile
          icon={Banknote}
          titulo="Dinheiro na gaveta"
          valor={esperado.dinheiro}
          sub="esperado agora"
          destaque
        />
        <Tile icon={QrCode} titulo="Pix" valor={movimentos.recebido.pix} sub="recebido" />
        <Tile
          icon={CreditCard}
          titulo="Cartões"
          valor={movimentos.recebido.debito + movimentos.recebido.credito}
          sub={`Débito ${formatBRL(movimentos.recebido.debito)} · Crédito ${formatBRL(movimentos.recebido.credito)}`}
        />
        <Tile
          icon={Wallet}
          titulo="Total recebido"
          valor={totalRecebido}
          sub={fiadoLancado ? `+ ${formatBRL(fiadoLancado)} no fiado` : 'sem fiado hoje'}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Lançamentos deste caixa</CardTitle>
            <CardDescription>
              Recebimentos, sangrias, suprimentos e despesas pagas com dinheiro da gaveta
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {lancamentos.length === 0 ? (
            <EmptyState
              compacto
              icon={Receipt}
              titulo="Nenhum lançamento ainda"
              descricao="As entregas cobradas aparecem aqui automaticamente."
            />
          ) : (
            <ul className="flex flex-col">
              {lancamentos.map((l) => (
                <LinhaLancamento key={l.chave} l={l} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <MovimentoDialog tipo={movimento} caixaId={caixa.id} onFechar={() => setMovimento(null)} />
      <DespesaDialog aberto={despesa} caixaId={caixa.id} onFechar={() => setDespesa(false)} />
      {fechar && <FechamentoDialog aberto resumo={data} onFechar={() => setFechar(false)} />}
    </div>
  )
}

function Tile({
  icon: Icon,
  titulo,
  valor,
  sub,
  destaque,
}: {
  icon: React.ComponentType<{ className?: string }>
  titulo: string
  valor: number
  sub: string
  destaque?: boolean
}) {
  return (
    <Card className={cn('flex flex-col gap-3 p-5', destaque && 'border-primary/40')}>
      <div className="flex items-center justify-between">
        <span className="text-muted text-sm font-medium">{titulo}</span>
        <span className="bg-primary-tint text-primary flex size-9 items-center justify-center rounded-xl">
          <Icon className="size-[18px]" />
        </span>
      </div>
      <AnimatedNumber
        value={valor}
        format={formatBRL}
        className="font-display text-[28px] leading-none font-bold tabular-nums"
      />
      <span className="text-muted truncate text-sm">{sub}</span>
    </Card>
  )
}

const INFO_LANC: Record<
  Lancamento['tipo'],
  { label: string; sinal: 1 | -1 | 0; icon: React.ComponentType<{ className?: string }> }
> = {
  venda: { label: 'Venda', sinal: 1, icon: Receipt },
  quitacao: { label: 'Quitação', sinal: 1, icon: HandCoins },
  fiado: { label: 'Fiado', sinal: 0, icon: HandCoins },
  suprimento: { label: 'Suprimento', sinal: 1, icon: ArrowDownToLine },
  entrada: { label: 'Entrada', sinal: 1, icon: ArrowDownToLine },
  sangria: { label: 'Sangria', sinal: -1, icon: ArrowUpFromLine },
  saida: { label: 'Saída', sinal: -1, icon: ArrowUpFromLine },
  despesa: { label: 'Despesa', sinal: -1, icon: ShoppingCart },
}

function LinhaLancamento({ l }: { l: Lancamento }) {
  const info = INFO_LANC[l.tipo]
  return (
    <li className="border-border flex items-center gap-4 border-b px-6 py-2.5 last:border-0">
      <span className="text-muted w-12 text-sm tabular-nums">{formatarHora(l.quando)}</span>
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-lg',
          info.sinal > 0
            ? 'bg-success-tint text-success'
            : info.sinal < 0
              ? 'bg-warning-tint text-warning'
              : 'bg-surface-2 text-muted',
        )}
      >
        <info.icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]">{l.descricao || info.label}</span>
        <span className="text-muted text-xs">
          {info.label}
          {l.forma && l.tipo !== 'despesa' && l.tipo !== 'sangria' && l.tipo !== 'suprimento'
            ? ` · ${labelForma(l.forma)}`
            : ''}
        </span>
      </span>
      <span
        className={cn(
          'font-semibold whitespace-nowrap tabular-nums',
          info.sinal > 0 ? 'text-success' : info.sinal < 0 ? 'text-warning' : 'text-muted',
        )}
      >
        {info.sinal > 0 ? '+' : info.sinal < 0 ? '−' : ''} {formatBRL(l.valor)}
      </span>
      <span className="w-9">
        {l.movimentoId && (
          <Tooltip content="Desfazer lançamento">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Desfazer lançamento"
              onClick={async () => {
                if (
                  !(await confirmar({
                    titulo: `Desfazer ${info.label.toLowerCase()} de ${formatBRL(l.valor)}?`,
                    confirmar: 'Desfazer',
                    perigoso: true,
                  }))
                )
                  return
                await excluirMovimento(await getDb(), l.movimentoId!)
                invalidarMovimento()
              }}
            >
              <Trash2 />
            </Button>
          </Tooltip>
        )}
      </span>
    </li>
  )
}

function Despesas() {
  const [mes, setMes] = useState(() => format(new Date(), 'yyyy-MM'))
  const ref = new Date(`${mes}-15T12:00:00`)
  const inicio = format(startOfMonth(ref), 'yyyy-MM-dd')
  const fim = format(endOfMonth(ref), 'yyyy-MM-dd')
  const { data } = useQuery({
    queryKey: [...qk.caixa, 'despesas', mes, ...qk.ordens],
    queryFn: async () => listarDespesas(await getDb(), inicio, fim),
  })
  const [nova, setNova] = useState(false)
  const porCategoria = Object.entries(
    (data ?? []).reduce<Record<string, number>>(
      (acc, d) => ({ ...acc, [d.categoria]: (acc[d.categoria] ?? 0) + d.valor }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1])
  const total = sum((data ?? []).map((d) => d.valor))

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Despesas do mês</CardTitle>
            <CardDescription>Total {formatBRL(total)}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              aria-label="Mês"
              value={mes}
              onChange={(e) => e.target.value && setMes(e.target.value)}
              className="border-border-strong bg-bg text-text h-11 rounded-[var(--radius-btn)] border px-3 text-[15px]"
            />
            <Button variant="primary" onClick={() => setNova(true)}>
              <ShoppingCart /> Nova despesa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {!data ? (
            <Skeleton className="mx-6 h-40" />
          ) : data.length === 0 ? (
            <EmptyState compacto icon={ShoppingCart} titulo="Nenhuma despesa neste mês" />
          ) : (
            <table className="w-full text-[15px]">
              <tbody>
                {data.map((d) => (
                  <tr key={d.id} className="border-border border-b last:border-0">
                    <td className="text-muted py-2.5 pr-3 pl-6">{formatarData(d.data)}</td>
                    <td className="px-3 py-2.5">
                      {d.descricao}
                      {d.caixa_id && <span className="text-muted ml-2 text-xs">(da gaveta)</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge>{d.categoria}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatBRL(d.valor)}</td>
                    <td className="w-14 pr-4">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Excluir despesa ${d.descricao}`}
                        onClick={async () => {
                          if (
                            !(await confirmar({
                              titulo: `Excluir “${d.descricao}”?`,
                              confirmar: 'Excluir',
                              perigoso: true,
                            }))
                          )
                            return
                          try {
                            await excluirDespesa(await getDb(), d.id)
                            invalidarMovimento()
                          } catch (e) {
                            toast.error(mensagemErro(e))
                          }
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Por categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {porCategoria.length === 0 && <p className="text-muted text-sm">Sem despesas.</p>}
          {porCategoria.map(([cat, v]) => (
            <div key={cat} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span>{cat}</span>
                <span className="font-semibold tabular-nums">{formatBRL(v)}</span>
              </div>
              <div className="bg-surface-2 h-2 overflow-hidden rounded-full">
                <div
                  className="bg-warning h-full rounded-full"
                  style={{ width: `${(v / (porCategoria[0]?.[1] || 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <DespesaDialog aberto={nova} caixaId={null} onFechar={() => setNova(false)} />
    </div>
  )
}

function HistoricoCaixas() {
  const { data } = useQuery({
    queryKey: [...qk.caixa, 'historico', ...qk.ordens],
    queryFn: async () => listarCaixas(await getDb()),
  })
  const [aberto, setAberto] = useState<number | null>(null)
  if (!data) return <Skeleton className="h-80 w-full rounded-[var(--radius-card)]" />
  if (data.length === 0)
    return (
      <Card>
        <EmptyState
          icon={History}
          titulo="Nenhum caixa fechado ainda"
          descricao="Os fechamentos aparecem aqui com a conferência."
        />
      </Card>
    )
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-[15px]">
        <thead>
          <tr className="border-border text-muted border-b text-left text-xs font-semibold tracking-wide uppercase">
            <th className="px-6 py-3">Data</th>
            <th className="px-3 py-3">Horário</th>
            <th className="px-3 py-3">Aberto por</th>
            <th className="px-3 py-3 text-right">Abertura</th>
            <th className="px-3 py-3 text-right">Recebido</th>
            <th className="px-3 py-3 text-right">Gaveta informada</th>
            <th className="px-6 py-3 text-right">Diferença</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => {
            const conf: Conferencia | null = c.conferencia ? JSON.parse(c.conferencia) : null
            const exp = aberto === c.id
            return (
              <Fragment key={c.id}>
                <tr
                  className={cn(
                    'border-border hover:bg-surface-2 cursor-pointer border-b',
                    exp && 'bg-surface-2',
                  )}
                  onClick={() => setAberto(exp ? null : c.id)}
                  aria-expanded={exp}
                >
                  <td className="px-6 py-3 font-medium">{formatarData(c.aberto_em)}</td>
                  <td className="text-muted px-3 py-3">
                    {formatarHora(c.aberto_em)} – {formatarHora(c.fechado_em)}
                  </td>
                  <td className="text-muted px-3 py-3">{c.usuario_nome ?? '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatBRL(c.valor_abertura)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatBRL(c.recebido)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatBRL(c.valor_fechamento_informado ?? 0)}
                  </td>
                  <td className="px-6 py-3">
                    <Diferenca valor={c.diferenca ?? 0} />
                  </td>
                </tr>
                {exp && (
                  <tr className="border-border bg-surface-2 border-b">
                    <td colSpan={7} className="px-6 pb-4">
                      {conf ? (
                        <div className="grid grid-cols-4 gap-3">
                          {conf.linhas.map((l) => (
                            <div
                              key={l.forma}
                              className="border-border bg-surface rounded-xl border p-3 text-sm"
                            >
                              <p className="font-semibold">{labelForma(l.forma)}</p>
                              <p className="text-muted">Esperado {formatBRL(l.esperado)}</p>
                              <p className="text-muted">Informado {formatBRL(l.informado)}</p>
                              <Diferenca valor={l.diferenca} className="mt-1 justify-start" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted text-sm">Fechamento sem conferência detalhada.</p>
                      )}
                      {c.observacoes && <p className="text-muted mt-3 text-sm">Obs.: {c.observacoes}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
