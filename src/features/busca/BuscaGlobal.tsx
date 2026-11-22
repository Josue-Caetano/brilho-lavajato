import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { Command } from 'cmdk'
import {
  CalendarDays,
  CalendarPlus,
  ChartColumn,
  CircleHelp,
  DatabaseBackup,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  Search,
  Settings,
  SquareKanban,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router'
import { PlateChip } from '@/components/PlateChip'
import { Badge, Kbd } from '@/components/ui/misc'
import { getDb } from '@/db'
import { buscaGlobal } from '@/db/repositories/busca'
import { semAcento } from '@/lib/importacao'
import { formatarTelefone } from '@/lib/telefone'
import { useEhDono } from '@/stores/sessao'
import { useUi } from '@/stores/ui'

interface Acao {
  id: string
  titulo: string
  palavras: string
  icon: React.ComponentType<{ className?: string }>
  atalho?: string
  executar: () => void
}

const itemClass =
  'flex h-12 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-[15px] outline-none data-[selected=true]:bg-surface-2 [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-muted'
const grupoClass =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase'

/** Paleta de comandos (Ctrl+K): busca placa, nome ou telefone e executa ações. */
export function BuscaGlobal() {
  const aberta = useUi((s) => s.busca)
  const setBusca = useUi((s) => s.setBusca)
  return (
    <DialogPrimitive.Root open={aberta} onOpenChange={setBusca}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-overlay data-[state=open]:animate-fade-in fixed inset-0 z-50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="border-border-strong bg-surface shadow-pop data-[state=open]:animate-pop-in fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-48px)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-[var(--radius-card)] border outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Busca</DialogPrimitive.Title>
          {aberta && <Paleta fechar={() => setBusca(false)} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Paleta({ fechar }: { fechar: () => void }) {
  const navigate = useNavigate()
  const ehDono = useEhDono()
  const [termo, setTermo] = useState('')
  const t = useDeferredValue(termo)
  const { data, isFetching } = useQuery({
    queryKey: ['busca-global', t],
    queryFn: async () => buscaGlobal(await getDb(), t),
    enabled: t.trim().length >= 2,
    placeholderData: (a) => a,
  })

  const ir = (rota: string) => () => {
    fechar()
    navigate(rota)
  }
  const acoes: Acao[] = [
    {
      id: 'novo',
      titulo: 'Novo carro',
      palavras: 'novo carro adicionar entrada fila',
      icon: Plus,
      atalho: 'F2',
      executar: () => {
        fechar()
        useUi.getState().abrirNovoCarro()
      },
    },
    {
      id: 'agendar',
      titulo: 'Novo agendamento',
      palavras: 'agendar agendamento horario marcar agenda',
      icon: CalendarPlus,
      atalho: 'F3',
      executar: () => {
        fechar()
        useUi.getState().abrirAgendamento()
      },
    },
    {
      id: 'agenda',
      titulo: 'Ver agenda',
      palavras: 'agenda horarios marcados semana',
      icon: CalendarDays,
      executar: ir('/agenda'),
    },
    {
      id: 'fila',
      titulo: 'Ver fila',
      palavras: 'fila kanban lavando pronto',
      icon: SquareKanban,
      executar: ir('/fila'),
    },
    {
      id: 'painel',
      titulo: 'Painel do dia',
      palavras: 'painel inicio hoje dashboard',
      icon: LayoutDashboard,
      executar: ir('/'),
    },
    {
      id: 'caixa',
      titulo: 'Abrir caixa',
      palavras: 'abrir fechar caixa sangria suprimento',
      icon: Wallet,
      executar: ir('/caixa'),
    },
    {
      id: 'clientes',
      titulo: 'Clientes',
      palavras: 'clientes cadastro lista',
      icon: Users,
      executar: ir('/clientes'),
    },
    ...(ehDono
      ? [
          {
            id: 'relatorio',
            titulo: 'Relatório do mês',
            palavras: 'relatorio mes faturamento lucro excel pdf',
            icon: ChartColumn,
            executar: ir('/relatorios'),
          },
          {
            id: 'backup',
            titulo: 'Fazer backup',
            palavras: 'backup copia seguranca restaurar',
            icon: DatabaseBackup,
            executar: ir('/configuracoes?aba=backup'),
          },
        ]
      : []),
    {
      id: 'config',
      titulo: 'Configurações',
      palavras: 'configuracoes ajustes tema',
      icon: Settings,
      executar: ir('/configuracoes'),
    },
    {
      id: 'ajuda',
      titulo: 'Atalhos de teclado',
      palavras: 'ajuda atalhos teclado help',
      icon: CircleHelp,
      atalho: 'F1',
      executar: () => {
        fechar()
        useUi.getState().setAjuda(true)
      },
    },
  ]
  const tn = semAcento(termo)
  const acoesFiltradas = tn ? acoes.filter((a) => semAcento(`${a.titulo} ${a.palavras}`).includes(tn)) : acoes
  const veiculos = t.trim().length >= 2 ? (data?.veiculos ?? []) : []
  const clientes = t.trim().length >= 2 ? (data?.clientes ?? []) : []
  const nada = acoesFiltradas.length === 0 && veiculos.length === 0 && clientes.length === 0

  // Quando os resultados mudam, a seleção volta para o primeiro item (Enter abre o melhor resultado).
  const ordemItens = [
    ...veiculos.map((v) => `v${v.veiculo_id}`),
    ...clientes.map((c) => `c${c.id}`),
    ...acoesFiltradas.map((a) => a.id),
  ]
  const assinatura = ordemItens.join(',')
  const [selecionado, setSelecionado] = useState('')
  const [assinaturaAnterior, setAssinaturaAnterior] = useState('')
  if (assinatura !== assinaturaAnterior) {
    setAssinaturaAnterior(assinatura)
    setSelecionado(ordemItens[0] ?? '')
  }

  return (
    <Command
      shouldFilter={false}
      loop
      label="Busca global"
      value={selecionado}
      onValueChange={setSelecionado}
    >
      <div className="border-border flex items-center gap-3 border-b px-4">
        {isFetching ? (
          <LoaderCircle className="text-muted size-5 animate-spin" />
        ) : (
          <Search className="text-muted size-5" />
        )}
        <Command.Input
          value={termo}
          onValueChange={setTermo}
          placeholder="Buscar placa, nome ou telefone… ou digite uma ação"
          className="text-text placeholder:text-muted h-14 flex-1 bg-transparent text-[17px] outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Command.List className="max-h-[56vh] overflow-y-auto p-2">
        {nada && <div className="text-muted py-10 text-center text-sm">Nada encontrado para “{termo}”.</div>}
        {veiculos.length > 0 && (
          <Command.Group heading="Veículos" className={grupoClass}>
            {veiculos.map((v) => (
              <Command.Item
                key={`v${v.veiculo_id}`}
                value={`v${v.veiculo_id}`}
                onSelect={ir(`/clientes/${v.cliente_id}`)}
                className={itemClass}
              >
                <PlateChip placa={v.placa} size="sm" />
                <span className="min-w-0 flex-1 truncate">
                  {v.cliente_nome}
                  <span className="text-muted"> · {[v.modelo, v.cor].filter(Boolean).join(' ')}</span>
                </span>
                {Number(v.na_fila) > 0 && <Badge tone="primary">Na fila</Badge>}
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {clientes.length > 0 && (
          <Command.Group heading="Clientes" className={grupoClass}>
            {clientes.map((c) => (
              <Command.Item
                key={`c${c.id}`}
                value={`c${c.id}`}
                onSelect={ir(`/clientes/${c.id}`)}
                className={itemClass}
              >
                <UserRound />
                <span className="min-w-0 flex-1 truncate">
                  {c.nome}
                  <span className="text-muted"> · {formatarTelefone(c.telefone) || 'sem telefone'}</span>
                </span>
                <span className="flex gap-1">
                  {c.placas
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => (
                      <PlateChip key={p} placa={p} size="sm" />
                    ))}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {acoesFiltradas.length > 0 && (
          <Command.Group heading="Ações" className={grupoClass}>
            {acoesFiltradas.map((a) => (
              <Command.Item key={a.id} value={a.id} onSelect={a.executar} className={itemClass}>
                <a.icon />
                <span className="flex-1">{a.titulo}</span>
                {a.atalho && <Kbd>{a.atalho}</Kbd>}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
      <div className="border-border text-muted flex items-center gap-4 border-t px-4 py-2.5 text-xs">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navegar
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Enter</Kbd> abrir
        </span>
      </div>
    </Command>
  )
}
