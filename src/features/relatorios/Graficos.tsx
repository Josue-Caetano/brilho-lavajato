import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip, eixo } from '@/components/charts/ChartTooltip'
import type { PontoDia } from '@/db/repositories/painel'
import { formatBRL, formatBRLCompact } from '@/lib/money'
import { labelForma } from '@/lib/ordem'
import { cn } from '@/lib/utils'

/** Ordem fixa das formas → cor categórica fixa (a cor segue a forma, nunca a posição no ranking). */
export const COR_FORMA: Record<string, string> = {
  pix: 'var(--chart-1)',
  dinheiro: 'var(--chart-2)',
  debito: 'var(--chart-3)',
  credito: 'var(--chart-4)',
  fiado: 'var(--chart-5)',
}
const ORDEM_FORMAS = ['pix', 'dinheiro', 'debito', 'credito', 'fiado']

export function LinhaFaturamento({ dados }: { dados: PontoDia[] }) {
  const pontos = dados.map((d) => ({ ...d, rotulo: format(parseISO(d.dia), 'dd/MM') }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={pontos} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={eixo} minTickGap={18} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={eixo}
          width={64}
          tickFormatter={(v: number) => formatBRLCompact(v)}
        />
        <Tooltip
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as (typeof pontos)[number] | undefined
            return (
              <ChartTooltip
                active={active}
                titulo={p && format(parseISO(p.dia), 'EEEE, dd/MM')}
                linhas={
                  p
                    ? [
                        { rotulo: 'Faturamento', valor: formatBRL(p.faturamento) },
                        { rotulo: 'Carros', valor: String(p.carros) },
                      ]
                    : []
                }
              />
            )
          }}
        />
        <Line
          type="monotone"
          dataKey="faturamento"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={pontos.length <= 2 ? { r: 4, fill: 'var(--primary)' } : false}
          activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
          animationDuration={500}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function RoscaFormas({ dados }: { dados: { forma: string; valor: number }[] }) {
  const ordenados = ORDEM_FORMAS.map((f) => dados.find((d) => d.forma === f)).filter(
    (d): d is { forma: string; valor: number } => !!d && d.valor > 0,
  )
  const total = ordenados.reduce((a, d) => a + d.valor, 0)
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ordenados}
              dataKey="valor"
              nameKey="forma"
              innerRadius="64%"
              outerRadius="100%"
              paddingAngle={ordenados.length > 1 ? 2 : 0}
              stroke="var(--surface)"
              strokeWidth={2}
              cornerRadius={4}
              animationDuration={500}
            >
              {ordenados.map((d) => (
                <Cell key={d.forma} fill={COR_FORMA[d.forma]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { forma: string; valor: number } | undefined
                return (
                  <ChartTooltip
                    active={active}
                    linhas={
                      p
                        ? [
                            {
                              cor: COR_FORMA[p.forma],
                              rotulo: labelForma(p.forma),
                              valor: `${formatBRL(p.valor)} · ${((p.valor / total) * 100).toFixed(0)}%`,
                            },
                          ]
                        : []
                    }
                  />
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-muted text-xs">Total</span>
          <span className="font-display text-sm font-bold">{formatBRLCompact(total)}</span>
        </div>
      </div>
      {/* Legenda em tabela: identidade nunca só pela cor, e valores sempre visíveis */}
      <table className="w-full text-sm">
        <tbody>
          {ordenados.map((d) => (
            <tr key={d.forma}>
              <td className="py-1 pr-2">
                <span className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-[3px]"
                    style={{ background: COR_FORMA[d.forma] }}
                    aria-hidden
                  />
                  {labelForma(d.forma)}
                </span>
              </td>
              <td className="py-1 text-right font-medium tabular-nums">{formatBRL(d.valor)}</td>
              <td className="text-muted w-12 py-1 text-right tabular-nums">
                {((d.valor / total) * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/** Mapa de calor dia × hora em um único tom (sequencial), do claro ao intenso. */
export function MapaCalor({ dados }: { dados: { dia: number; hora: number; carros: number }[] }) {
  const horas = dados.length
    ? Array.from(
        { length: Math.max(...dados.map((d) => d.hora)) - Math.min(...dados.map((d) => d.hora)) + 1 },
        (_, i) => Math.min(...dados.map((d) => d.hora)) + i,
      )
    : Array.from({ length: 11 }, (_, i) => 8 + i)
  const max = Math.max(1, ...dados.map((d) => d.carros))
  const valor = (dia: number, hora: number) =>
    dados.find((d) => d.dia === dia && d.hora === hora)?.carros ?? 0
  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `36px repeat(${horas.length}, minmax(0, 1fr))` }}
        role="table"
        aria-label="Carros por dia da semana e hora"
      >
        <span />
        {horas.map((h) => (
          <span key={h} className="text-muted text-center text-[11px]" role="columnheader">
            {h}h
          </span>
        ))}
        {DIAS.map((nome, dia) => (
          <div key={nome} className="contents" role="row">
            <span className="text-muted flex items-center text-xs" role="rowheader">
              {nome}
            </span>
            {horas.map((h) => {
              const v = valor(dia, h)
              const t = v / max
              return (
                <span
                  key={h}
                  role="cell"
                  title={`${nome} ${h}h: ${v} carro${v === 1 ? '' : 's'}`}
                  aria-label={`${nome} ${h}h: ${v} carros`}
                  className={cn(
                    'h-7 rounded-[5px] transition-transform hover:scale-110',
                    v === 0 && 'bg-surface-2',
                  )}
                  style={v ? { background: 'var(--primary)', opacity: 0.18 + t * 0.82 } : undefined}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="text-muted flex items-center justify-end gap-1.5 text-xs">
        Menos
        {[0.18, 0.4, 0.6, 0.8, 1].map((o) => (
          <span key={o} className="bg-primary size-3.5 rounded-[3px]" style={{ opacity: o }} />
        ))}
        Mais
      </div>
    </div>
  )
}

/** Barras horizontais simples com rótulo e valor (serviços, funcionários, despesas). */
export function Barras({
  itens,
  tom = 'primary',
}: {
  itens: { rotulo: string; valor: number; detalhe: string }[]
  tom?: 'primary' | 'warning'
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor))
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{i.rotulo}</span>
            <span className="text-muted shrink-0 tabular-nums">{i.detalhe}</span>
          </div>
          <div className="bg-surface-2 h-2 overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full origin-left animate-[grow_600ms_ease-out] rounded-full',
                tom === 'primary' ? 'bg-primary' : 'bg-warning',
              )}
              style={{ width: `${(i.valor / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
