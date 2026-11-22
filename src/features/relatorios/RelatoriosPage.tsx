import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  ChartLine,
  FileSpreadsheet,
  FileText,
  PiggyBank,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { qk, useConfig } from '@/app/queries'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState, Segmented, Skeleton } from '@/components/ui/misc'
import { getDb } from '@/db'
import { gerarRelatorio, ordensDoPeriodo, type Periodo } from '@/db/repositories/relatorios'
import { salvarArquivo } from '@/lib/arquivos'
import { formatarData } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { relatorioParaExcel } from '@/lib/exportar'
import { formatBRL, formatBRLCompact } from '@/lib/money'
import { cn } from '@/lib/utils'
import { Barras, LinhaFaturamento, MapaCalor, RoscaFormas } from './Graficos'
import { periodoDoAtalho, type AtalhoPeriodo } from './periodo'
import { RelatorioImpressao } from './RelatorioImpressao'

export default function RelatoriosPage() {
  const { data: cfg } = useConfig()
  const [atalho, setAtalho] = useState<AtalhoPeriodo>('mes')
  const [custom, setCustom] = useState<Periodo>(() => periodoDoAtalho('mes'))
  const periodo = atalho === 'personalizado' ? custom : periodoDoAtalho(atalho)
  const valido = periodo.inicio <= periodo.fim
  const { data: r, isFetching } = useQuery({
    queryKey: [...qk.ordens, 'relatorio', periodo.inicio, periodo.fim],
    queryFn: async () => gerarRelatorio(await getDb(), periodo),
    enabled: valido,
    placeholderData: (anterior) => anterior,
  })
  const [exportando, setExportando] = useState(false)
  const empresa = cfg?.empresa.nome ?? 'Brilho'

  const exportarExcel = async () => {
    if (!r) return
    setExportando(true)
    try {
      const bytes = relatorioParaExcel(r, await ordensDoPeriodo(await getDb(), periodo), empresa)
      const salvo = await salvarArquivo(
        `relatorio-${periodo.inicio}-a-${periodo.fim}.xlsx`,
        bytes,
        { name: 'Planilha do Excel', extensions: ['xlsx'] },
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      if (salvo) toast.success('Planilha exportada.', { description: salvo })
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          aria-label="Período"
          value={atalho}
          onChange={setAtalho}
          options={[
            { value: 'hoje', label: 'Hoje' },
            { value: '7dias', label: '7 dias' },
            { value: 'mes', label: 'Este mês' },
            { value: 'personalizado', label: 'Personalizado' },
          ]}
        />
        {atalho === 'personalizado' ? (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="Data inicial"
              className="w-44"
              value={custom.inicio}
              onChange={(e) => e.target.value && setCustom((c) => ({ ...c, inicio: e.target.value }))}
            />
            <span className="text-muted">até</span>
            <Input
              type="date"
              aria-label="Data final"
              className="w-44"
              value={custom.fim}
              aria-invalid={!valido}
              onChange={(e) => e.target.value && setCustom((c) => ({ ...c, fim: e.target.value }))}
            />
          </div>
        ) : (
          <span className="text-muted flex items-center gap-2 text-sm">
            <CalendarDays className="size-4" />
            {formatarData(periodo.inicio)}
            {periodo.inicio !== periodo.fim && ` a ${formatarData(periodo.fim)}`}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={exportarExcel} loading={exportando} disabled={!r}>
            <FileSpreadsheet /> Excel
          </Button>
          <Button variant="secondary" onClick={() => window.print()} disabled={!r}>
            <FileText /> PDF
          </Button>
        </div>
      </div>

      {!r ? (
        <Skeleton className="h-[600px] w-full rounded-[var(--radius-card)]" />
      ) : (
        <div className={cn('flex flex-col gap-4 transition-opacity', isFetching && 'opacity-70')}>
          <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
            <Tile icon={Wallet} titulo="Faturamento" valor={r.resumo.faturamento} />
            <Tile icon={TrendingUp} titulo="Carros" valor={r.resumo.carros} moeda={false} />
            <Tile icon={Receipt} titulo="Ticket médio" valor={r.resumo.ticketMedio} />
            <Tile icon={Receipt} titulo="Despesas" valor={r.resumo.despesas} />
            <Tile
              icon={PiggyBank}
              titulo="Lucro estimado"
              valor={r.resumo.lucro}
              tom={r.resumo.lucro >= 0 ? 'success' : 'danger'}
            />
          </div>

          {r.resumo.carros === 0 ? (
            <Card>
              <EmptyState
                icon={ChartLine}
                titulo="Sem movimento no período"
                descricao="Escolha outro período para ver os números."
              />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <div>
                      <CardTitle>Faturamento por dia</CardTitle>
                      <CardDescription>
                        Descontos concedidos: {formatBRL(r.resumo.descontos)} · Fiado em aberto:{' '}
                        {formatBRL(r.resumo.fiadoEmAberto)}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[340px] pb-4">
                    <LinhaFaturamento dados={r.porDia} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Por forma de pagamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RoscaFormas dados={r.formas} />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Por serviço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Barras
                      itens={r.servicos.slice(0, 8).map((s) => ({
                        rotulo: s.nome,
                        valor: s.quantidade,
                        detalhe: `${s.quantidade} · ${formatBRLCompact(s.receita)}`,
                      }))}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Por funcionário</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Barras
                      itens={r.funcionarios.map((f) => ({
                        rotulo: f.nome,
                        valor: f.faturamento,
                        detalhe: `${f.carros} carros · ${formatBRLCompact(f.faturamento)}`,
                      }))}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Despesas e lucro</CardTitle>
                      <CardDescription>Lucro estimado = faturamento − despesas</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {r.despesas.length ? (
                      <Barras
                        tom="warning"
                        itens={r.despesas.slice(0, 5).map((d) => ({
                          rotulo: d.categoria,
                          valor: d.valor,
                          detalhe: formatBRL(d.valor),
                        }))}
                      />
                    ) : (
                      <p className="text-muted text-sm">Nenhuma despesa lançada no período.</p>
                    )}
                    <dl className="bg-surface-2 grid grid-cols-3 gap-2 rounded-xl p-3 text-center text-sm">
                      <div>
                        <dt className="text-muted">Entrou</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatBRLCompact(r.resumo.faturamento)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">Saiu</dt>
                        <dd className="font-semibold tabular-nums">{formatBRLCompact(r.resumo.despesas)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Sobrou</dt>
                        <dd
                          className={cn(
                            'font-semibold tabular-nums',
                            r.resumo.lucro >= 0 ? 'text-success' : 'text-danger',
                          )}
                        >
                          {formatBRLCompact(r.resumo.lucro)}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <div>
                      <CardTitle>Horários de pico</CardTitle>
                      <CardDescription>Carros que entraram por dia da semana e hora</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <MapaCalor dados={r.calor} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Clientes novos × recorrentes</CardTitle>
                      <CardDescription>Novo = primeira visita dentro do período</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <NovosRecorrentes c={r.clientes} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
      {r &&
        createPortal(
          <div className="print-area hidden print:block">
            <RelatorioImpressao r={r} empresa={empresa} />
          </div>,
          document.body,
        )}
    </div>
  )
}

function Tile({
  icon: Icon,
  titulo,
  valor,
  moeda = true,
  tom,
}: {
  icon: React.ComponentType<{ className?: string }>
  titulo: string
  valor: number
  moeda?: boolean
  tom?: 'success' | 'danger'
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-muted text-sm font-medium">{titulo}</span>
        <Icon className="text-primary size-[18px]" />
      </div>
      <AnimatedNumber
        value={valor}
        format={moeda ? formatBRL : undefined}
        className={cn(
          'font-display text-2xl leading-none font-bold tabular-nums',
          tom === 'success' && 'text-success',
          tom === 'danger' && 'text-danger',
        )}
      />
    </Card>
  )
}

function NovosRecorrentes({
  c,
}: {
  c: { novos: number; recorrentes: number; faturamentoNovos: number; faturamentoRecorrentes: number }
}) {
  const total = c.novos + c.recorrentes || 1
  const pNovos = (c.novos / total) * 100
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex h-3 overflow-hidden rounded-full"
        role="img"
        aria-label={`${c.novos} novos e ${c.recorrentes} recorrentes`}
      >
        <div className="h-full bg-[var(--chart-1)]" style={{ width: `${pNovos}%` }} />
        <div className="bg-surface h-full w-[2px]" />
        <div className="h-full flex-1 bg-[var(--chart-2)]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ['Novos', c.novos, c.faturamentoNovos, 'var(--chart-1)'],
            ['Recorrentes', c.recorrentes, c.faturamentoRecorrentes, 'var(--chart-2)'],
          ] as const
        ).map(([rotulo, n, fat, cor]) => (
          <div key={rotulo} className="bg-surface-2 rounded-xl p-3">
            <p className="text-muted flex items-center gap-2 text-sm">
              <span className="size-3 rounded-[3px]" style={{ background: cor }} aria-hidden />
              {rotulo}
            </p>
            <p className="font-display mt-1 flex items-baseline gap-1.5 text-2xl font-bold">
              {n} <Users className="text-muted size-4" />
            </p>
            <p className="text-muted text-sm tabular-nums">{formatBRL(fat)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
