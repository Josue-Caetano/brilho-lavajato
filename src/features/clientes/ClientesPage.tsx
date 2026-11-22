import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, UserPlus, Users } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { qk, useConfig } from '@/app/queries'
import { PlateChip } from '@/components/PlateChip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge, EmptyState, Progress, Segmented, Skeleton } from '@/components/ui/misc'
import { getDb } from '@/db'
import { listarClientesTabela, type ClienteLinha } from '@/db/repositories/clientes'
import { useAgora } from '@/hooks/useAgora'
import { formatarData } from '@/lib/datas'
import { progressoFidelidade } from '@/lib/fidelidade'
import { formatBRL } from '@/lib/money'
import { normalizarPlaca } from '@/lib/placa'
import { formatarTelefone, normalizarTelefone } from '@/lib/telefone'
import { cn } from '@/lib/utils'
import { useEhDono } from '@/stores/sessao'
import { ClienteFormDialog } from './ClienteFormDialog'

type Filtro = 'todos' | 'fiado' | 'sumidos' | 'premio'
type Coluna = 'nome' | 'visitas' | 'totalGasto' | 'ultimaVisita' | 'fidelidade'

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export default function ClientesPage() {
  const navigate = useNavigate()
  const ehDono = useEhDono()
  const agora = useAgora(5 * 60_000)
  const { data: cfg } = useConfig()
  const { data, isLoading } = useQuery({
    queryKey: [...qk.clientes, 'tabela', ...qk.ordens],
    queryFn: async () => listarClientesTabela(await getDb()),
  })
  const [busca, setBusca] = useState('')
  const termo = useDeferredValue(busca)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [ordem, setOrdem] = useState<{ col: Coluna; desc: boolean }>({ col: 'ultimaVisita', desc: true })
  const [novo, setNovo] = useState(false)

  const fidelidadeCfg = cfg?.fidelidade
  const diasSumido = cfg?.diasSumido ?? 30

  const linhas = useMemo(() => {
    if (!data) return []
    const regra = fidelidadeCfg ?? { ativo: false, lavagens: 10 }
    const t = semAcento(termo.trim())
    const tPlaca = normalizarPlaca(termo)
    const tTel = normalizarTelefone(termo)
    const limite = agora.getTime() - diasSumido * 86_400_000
    const lista = data
      .map((c) => ({ ...c, fid: progressoFidelidade(c.pagas, c.cortesias, regra) }))
      .filter((c) => {
        if (t) {
          const ok =
            semAcento(c.nome).includes(t) ||
            (tPlaca.length >= 3 && c.placas.includes(tPlaca)) ||
            (tTel.length >= 4 && (c.telefone ?? '').includes(tTel))
          if (!ok) return false
        }
        if (filtro === 'fiado') return c.fiado > 0
        if (filtro === 'sumidos') return !!c.ultimaVisita && new Date(c.ultimaVisita).getTime() < limite
        if (filtro === 'premio') return regra.ativo && c.fid.faltam <= 1
        return true
      })
    const val = (c: (typeof lista)[number]): string | number => {
      switch (ordem.col) {
        case 'nome':
          return semAcento(c.nome)
        case 'fidelidade':
          return c.fid.atual
        case 'ultimaVisita':
          return c.ultimaVisita ?? ''
        default:
          return c[ordem.col]
      }
    }
    return lista.sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      const r = va < vb ? -1 : va > vb ? 1 : 0
      return ordem.desc ? -r : r
    })
  }, [data, termo, filtro, ordem, fidelidadeCfg, diasSumido, agora])

  const ordenar = (col: Coluna) =>
    setOrdem((o) => (o.col === col ? { col, desc: !o.desc } : { col, desc: col !== 'nome' }))

  return (
    <Card className="flex min-h-full flex-col overflow-hidden">
      <div className="border-border flex flex-wrap items-center gap-3 border-b p-4">
        <div className="relative w-80">
          <Search className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, telefone ou placa"
            className="pl-10"
            aria-label="Buscar clientes"
          />
        </div>
        <Segmented
          aria-label="Filtro"
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'fiado', label: 'Com fiado' },
            { value: 'sumidos', label: 'Sumidos' },
            { value: 'premio', label: 'Perto do prêmio' },
          ]}
        />
        <span className="text-muted ml-auto text-sm">
          {data ? `${linhas.length} de ${data.length} clientes` : ''}
        </span>
        <Button variant="primary" onClick={() => setNovo(true)}>
          <UserPlus /> Novo cliente
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-[15px]">
          <thead className="bg-surface sticky top-0 z-10">
            <tr className="border-border text-muted border-b text-left text-xs font-semibold tracking-wide uppercase">
              <Th col="nome" ordem={ordem} onClick={ordenar}>
                Cliente
              </Th>
              <th className="px-4 py-3 font-semibold">Veículos</th>
              <Th col="visitas" ordem={ordem} onClick={ordenar} className="text-right">
                Visitas
              </Th>
              {ehDono && (
                <Th col="totalGasto" ordem={ordem} onClick={ordenar} className="text-right">
                  Total gasto
                </Th>
              )}
              <Th col="ultimaVisita" ordem={ordem} onClick={ordenar}>
                Última visita
              </Th>
              <Th col="fidelidade" ordem={ordem} onClick={ordenar}>
                Fidelidade
              </Th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i} className="border-border border-b">
                  <td colSpan={6} className="px-4 py-3">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ))}
            {linhas.map((c) => (
              <Linha key={c.id} c={c} ehDono={ehDono} onAbrir={() => navigate(`/clientes/${c.id}`)} />
            ))}
          </tbody>
        </table>
        {data && linhas.length === 0 && (
          <EmptyState
            icon={Users}
            titulo={data.length === 0 ? 'Nenhum cliente ainda' : 'Nenhum cliente encontrado'}
            descricao={
              data.length === 0
                ? 'Os clientes são cadastrados ao colocar um carro na fila, ou importados da sua planilha em Configurações.'
                : 'Tente outro nome, telefone ou placa.'
            }
            acao={
              data.length === 0 && (
                <Button variant="primary" onClick={() => setNovo(true)}>
                  <UserPlus /> Cadastrar cliente
                </Button>
              )
            }
          />
        )}
      </div>
      <ClienteFormDialog
        aberto={novo}
        onFechar={() => setNovo(false)}
        onSalvo={(id) => navigate(`/clientes/${id}`)}
      />
    </Card>
  )
}

function Th({
  col,
  ordem,
  onClick,
  className,
  children,
}: {
  col: Coluna
  ordem: { col: Coluna; desc: boolean }
  onClick: (c: Coluna) => void
  className?: string
  children: React.ReactNode
}) {
  const ativa = ordem.col === col
  const Icone = ativa ? (ordem.desc ? ArrowDown : ArrowUp) : ArrowUpDown
  return (
    <th
      className={cn('px-4 py-1.5 font-semibold', className)}
      aria-sort={ativa ? (ordem.desc ? 'descending' : 'ascending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onClick(col)}
        className={cn(
          'hover:text-text -mx-1.5 inline-flex h-9 items-center gap-1 rounded-lg px-1.5 uppercase',
          ativa && 'text-text',
        )}
      >
        {children}
        <Icone className={cn('size-3.5', !ativa && 'opacity-40')} />
      </button>
    </th>
  )
}

function Linha({
  c,
  ehDono,
  onAbrir,
}: {
  c: ClienteLinha & { fid: ReturnType<typeof progressoFidelidade> }
  ehDono: boolean
  onAbrir: () => void
}) {
  const placas = c.placas.split(' ').filter(Boolean)
  return (
    <tr
      className="border-border hover:bg-surface-2 cursor-pointer border-b transition-colors last:border-0"
      onClick={onAbrir}
    >
      <td className="px-4 py-3">
        <a
          href={`#/clientes/${c.id}`}
          className="hover:text-primary font-semibold"
          onClick={(e) => e.stopPropagation()}
        >
          {c.nome}
        </a>
        <div className="text-muted flex items-center gap-2 text-sm">
          {formatarTelefone(c.telefone) || 'Sem telefone'}
          {c.fiado > 0 && <Badge tone="warning">Fiado {formatBRL(c.fiado)}</Badge>}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {placas.slice(0, 3).map((p) => (
            <PlateChip key={p} placa={p} size="sm" />
          ))}
          {placas.length > 3 && <span className="text-muted text-sm">+{placas.length - 3}</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{c.visitas}</td>
      {ehDono && <td className="px-4 py-3 text-right font-medium tabular-nums">{formatBRL(c.totalGasto)}</td>}
      <td className="text-muted px-4 py-3">{c.ultimaVisita ? formatarData(c.ultimaVisita) : '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Progress
            value={c.fid.atual}
            max={c.fid.meta}
            tone={c.fid.faltam <= 1 ? 'success' : 'primary'}
            className="w-24"
            label={`Fidelidade de ${c.nome}`}
          />
          <span className="text-muted text-sm tabular-nums">
            {c.fid.premioDisponivel ? 'Grátis!' : `${c.fid.atual}/${c.fid.meta}`}
          </span>
        </div>
      </td>
    </tr>
  )
}
