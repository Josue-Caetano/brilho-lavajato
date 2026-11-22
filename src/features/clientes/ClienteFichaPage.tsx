import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Car,
  HandCoins,
  History,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { invalidarMovimento, qk, useConfig } from '@/app/queries'
import { PlateChip } from '@/components/PlateChip'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { confirmar } from '@/components/ui/confirm'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { Badge, EmptyState, Progress, Segmented, Skeleton } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { getDb } from '@/db'
import { caixaAberto } from '@/db/repositories/caixa'
import {
  atualizarCliente,
  contagemFidelidade,
  excluirCliente,
  excluirVeiculo,
  fiadosDoCliente,
  historicoCliente,
  obterCliente,
  quitarFiados,
  veiculosDoCliente,
  type Veiculo,
} from '@/db/repositories/clientes'
import { formatarData, formatarDataHora } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { progressoFidelidade } from '@/lib/fidelidade'
import { formatBRL } from '@/lib/money'
import { labelForma, TIPOS_VEICULO } from '@/lib/ordem'
import { abrirLink } from '@/lib/plataforma'
import { formatarTelefone } from '@/lib/telefone'
import { cn, sum } from '@/lib/utils'
import { linkWhatsApp, preencherModelo, primeiroNome } from '@/lib/whatsapp'
import { useEhDono } from '@/stores/sessao'
import { useUi } from '@/stores/ui'
import { ClienteFormDialog } from './ClienteFormDialog'
import { VeiculoFormDialog } from './VeiculoFormDialog'

const STATUS: Record<
  string,
  { label: string; tone: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' }
> = {
  aguardando: { label: 'Aguardando', tone: 'neutral' },
  lavando: { label: 'Lavando', tone: 'primary' },
  acabamento: { label: 'Acabamento', tone: 'warning' },
  pronto: { label: 'Pronto', tone: 'success' },
  entregue: { label: 'Entregue', tone: 'neutral' },
  cancelada: { label: 'Cancelada', tone: 'danger' },
}

export default function ClienteFichaPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const ehDono = useEhDono()
  const { data: cfg } = useConfig()
  const { data, isLoading } = useQuery({
    queryKey: [...qk.clientes, 'ficha', id, ...qk.ordens],
    queryFn: async () => {
      const db = await getDb()
      const cliente = await obterCliente(db, id)
      if (!cliente) return null
      const [veiculos, historico, fiados, fid] = await Promise.all([
        veiculosDoCliente(db, id),
        historicoCliente(db, id),
        fiadosDoCliente(db, id),
        contagemFidelidade(db, id),
      ])
      return { cliente, veiculos, historico, fiados, fid }
    },
  })
  const [editar, setEditar] = useState(false)
  const [veiculoForm, setVeiculoForm] = useState<{ aberto: boolean; veiculo?: Veiculo | null }>({
    aberto: false,
  })
  const [quitar, setQuitar] = useState(false)

  if (isLoading) return <Skeleton className="h-96 w-full rounded-[var(--radius-card)]" />
  if (!data) {
    return (
      <Card>
        <EmptyState
          icon={Car}
          titulo="Cliente não encontrado"
          acao={
            <Button asChild variant="secondary">
              <Link to="/clientes">Voltar para clientes</Link>
            </Button>
          }
        />
      </Card>
    )
  }

  const { cliente, veiculos, historico, fiados, fid } = data
  const entregues = historico.filter((h) => h.status === 'entregue')
  const totalGasto = sum(entregues.map((h) => h.total))
  const progresso = progressoFidelidade(
    fid.pagas,
    fid.cortesias,
    cfg?.fidelidade ?? { ativo: false, lavagens: 10 },
  )
  const totalFiado = sum(fiados.map((f) => f.valor))

  const whats = (msg: string) => {
    const url = linkWhatsApp(cliente.telefone, msg)
    if (!url) return toast.error('Cliente sem telefone cadastrado.')
    void abrirLink(url).catch(() => toast.error('Não foi possível abrir o WhatsApp.'))
  }

  const excluir = async () => {
    if (
      !(await confirmar({
        titulo: `Excluir ${cliente.nome}?`,
        descricao: 'O cliente e seus veículos serão apagados. Essa ação não pode ser desfeita.',
        confirmar: 'Excluir',
        perigoso: true,
      }))
    )
      return
    try {
      if (await excluirCliente(await getDb(), cliente.id)) {
        invalidarMovimento()
        toast.success('Cliente excluído.')
        navigate('/clientes')
      } else toast.error('Este cliente tem ordens no histórico e não pode ser excluído.')
    } catch (e) {
      toast.error(mensagemErro(e))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild aria-label="Voltar para clientes">
          <Link to="/clientes">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="font-display truncate text-2xl font-bold">{cliente.nome}</h2>
          <p className="text-muted text-sm">
            {formatarTelefone(cliente.telefone) || 'Sem telefone'} · cliente desde{' '}
            {formatarData(cliente.criado_em)}
            {cliente.aniversario &&
              ` · aniversário ${cliente.aniversario.slice(3, 5)}/${cliente.aniversario.slice(0, 2)}`}
          </p>
        </div>
        <Button
          variant="whatsapp"
          disabled={!cliente.telefone}
          onClick={() => whats(`Olá, ${primeiroNome(cliente.nome)}! `)}
        >
          <MessageCircle /> WhatsApp
        </Button>
        <Button variant="secondary" onClick={() => setEditar(true)}>
          <Pencil /> Editar
        </Button>
        {historico.length === 0 && (
          <Tooltip content="Excluir cliente">
            <Button variant="ghost" size="icon" aria-label="Excluir cliente" onClick={excluir}>
              <Trash2 />
            </Button>
          </Tooltip>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          titulo="Visitas"
          valor={String(entregues.length)}
          sub={entregues[0] ? `Última em ${formatarData(entregues[0].entregue_em)}` : 'Nenhuma ainda'}
        />
        <Stat
          titulo="Total gasto"
          valor={ehDono ? formatBRL(totalGasto) : '••••'}
          sub={ehDono ? 'em lavagens entregues' : 'Visível apenas para o dono'}
        />
        <Stat
          titulo="Ticket médio"
          valor={
            ehDono ? formatBRL(entregues.length ? Math.round(totalGasto / entregues.length) : 0) : '••••'
          }
          sub="por visita"
        />
        <Card className="flex flex-col gap-3 p-5">
          <span className="text-muted text-sm font-medium">Fidelidade</span>
          <span className="font-display text-[28px] leading-none font-bold tabular-nums">
            {progresso.atual}
            <span className="text-muted text-lg">/{progresso.meta}</span>
          </span>
          <Progress
            value={progresso.atual}
            max={progresso.meta}
            tone={progresso.faltam <= 1 ? 'success' : 'primary'}
            label="Progresso da fidelidade"
          />
          <span className="text-muted text-sm">
            {progresso.premioDisponivel
              ? 'Próxima lavagem é grátis!'
              : `Faltam ${progresso.faltam} para a lavagem grátis`}
            {fid.cortesias > 0 && ` · ${fid.cortesias} já usada${fid.cortesias > 1 ? 's' : ''}`}
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Histórico de ordens</CardTitle>
              <CardDescription>
                {historico.length} {historico.length === 1 ? 'ordem' : 'ordens'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {historico.length === 0 ? (
              <EmptyState
                compacto
                icon={History}
                titulo="Nenhuma ordem ainda"
                descricao="As lavagens deste cliente aparecem aqui."
              />
            ) : (
              <div className="max-h-[480px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-muted sticky top-0 text-left text-xs tracking-wide uppercase">
                    <tr className="border-border border-b">
                      <th className="px-6 py-2.5 font-semibold">Data</th>
                      <th className="px-3 py-2.5 font-semibold">Veículo</th>
                      <th className="px-3 py-2.5 font-semibold">Serviços</th>
                      <th className="px-3 py-2.5 font-semibold">Pagamento</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                      <th className="w-14 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((h) => (
                      <tr key={h.id} className="border-border border-b last:border-0">
                        <td className="px-6 py-2.5 whitespace-nowrap">
                          {formatarDataHora(h.entregue_em ?? h.entrada_em)}
                          <div className="text-muted text-xs">Nº {h.numero}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <PlateChip placa={h.placa} size="sm" />
                        </td>
                        <td className="px-3 py-2.5">
                          {h.servicos}
                          {h.cortesia === 1 && (
                            <Badge tone="success" className="ml-2">
                              Grátis
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {h.status === 'entregue' ? (
                            <span className="text-muted">
                              {(h.formas ?? '').split(',').filter(Boolean).map(labelForma).join(' + ') || '—'}
                            </span>
                          ) : (
                            <Badge tone={STATUS[h.status]?.tone}>{STATUS[h.status]?.label}</Badge>
                          )}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-medium tabular-nums',
                            h.status === 'cancelada' && 'text-muted line-through',
                          )}
                        >
                          {formatBRL(h.total)}
                        </td>
                        <td className="px-3 py-1">
                          {h.status === 'entregue' && (
                            <Tooltip content="Ver comprovante">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Comprovante da ordem ${h.numero}`}
                                onClick={() => useUi.getState().abrirComprovante(h.id)}
                              >
                                <Printer />
                              </Button>
                            </Tooltip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {fiados.length > 0 && (
            <Card className="border-warning/40">
              <CardHeader>
                <div>
                  <CardTitle className="text-warning flex items-center gap-2">
                    <HandCoins className="size-4" /> Fiado em aberto
                  </CardTitle>
                  <CardDescription>
                    {fiados.length} {fiados.length === 1 ? 'ordem' : 'ordens'}
                  </CardDescription>
                </div>
                <span className="font-display text-warning text-xl font-bold tabular-nums">
                  {formatBRL(totalFiado)}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ul className="flex flex-col gap-1.5 text-sm">
                  {fiados.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2">
                      <span className="text-muted">
                        {formatarData(f.pago_em)} · Nº {f.numero}
                      </span>
                      <span className="tabular-nums">{formatBRL(f.valor)}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="whatsapp"
                    size="sm"
                    disabled={!cliente.telefone}
                    onClick={() =>
                      whats(
                        preencherModelo(cfg?.mensagens.cobranca ?? '', {
                          nome: primeiroNome(cliente.nome),
                          total: formatBRL(totalFiado),
                          empresa: cfg?.empresa.nome,
                        }),
                      )
                    }
                  >
                    <MessageCircle /> Cobrar
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setQuitar(true)}>
                    Quitar fiado
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Veículos</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVeiculoForm({ aberto: true, veiculo: null })}
              >
                <Plus /> Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              {veiculos.length === 0 ? (
                <p className="text-muted text-sm">Nenhum veículo cadastrado.</p>
              ) : (
                <ul className="divide-border flex flex-col divide-y">
                  {veiculos.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <PlateChip placa={v.placa} />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block truncate font-medium">{v.modelo || 'Veículo'}</span>
                        <span className="text-muted">
                          {[v.cor, TIPOS_VEICULO.find((t) => t.value === v.tipo)?.label]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Editar ${v.placa}`}
                        onClick={() => setVeiculoForm({ aberto: true, veiculo: v })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Excluir ${v.placa}`}
                        onClick={async () => {
                          if (
                            !(await confirmar({
                              titulo: `Excluir o veículo ${v.placa}?`,
                              confirmar: 'Excluir',
                              perigoso: true,
                            }))
                          )
                            return
                          if (await excluirVeiculo(await getDb(), v.id)) {
                            invalidarMovimento()
                            toast.success('Veículo excluído.')
                          } else toast.error('Este veículo tem ordens no histórico e não pode ser excluído.')
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Observacoes key={cliente.observacoes ?? ''} clienteId={cliente.id} cliente={cliente} />
        </div>
      </div>

      <ClienteFormDialog aberto={editar} onFechar={() => setEditar(false)} cliente={cliente} />
      <VeiculoFormDialog
        clienteId={cliente.id}
        aberto={veiculoForm.aberto}
        veiculo={veiculoForm.veiculo}
        onFechar={() => setVeiculoForm({ aberto: false })}
      />
      <QuitarDialog
        aberto={quitar}
        onFechar={() => setQuitar(false)}
        ids={fiados.map((f) => f.id)}
        total={totalFiado}
      />
    </div>
  )
}

function Stat({ titulo, valor, sub }: { titulo: string; valor: string; sub: string }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className="text-muted text-sm font-medium">{titulo}</span>
      <span className="font-display text-[28px] leading-none font-bold tabular-nums">{valor}</span>
      <span className="text-muted text-sm">{sub}</span>
    </Card>
  )
}

function Observacoes({
  clienteId,
  cliente,
}: {
  clienteId: number
  cliente: { nome: string; telefone: string | null; observacoes: string | null; aniversario: string | null }
}) {
  const [texto, setTexto] = useState(cliente.observacoes ?? '')
  const alterado = texto !== (cliente.observacoes ?? '')
  const salvar = useMutation({
    mutationFn: async () =>
      atualizarCliente(await getDb(), clienteId, {
        nome: cliente.nome,
        telefone: cliente.telefone ?? '',
        aniversario: cliente.aniversario ?? '',
        observacoes: texto,
      }),
    onSuccess: () => {
      invalidarMovimento()
      toast.success('Observações salvas.')
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="text-muted size-4" /> Observações
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          aria-label="Observações do cliente"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: não usar pretinho no pneu"
          rows={3}
        />
        {alterado && (
          <Button
            variant="primary"
            size="sm"
            className="self-end"
            onClick={() => salvar.mutate()}
            loading={salvar.isPending}
          >
            Salvar observações
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function QuitarDialog({
  aberto,
  onFechar,
  ids,
  total,
}: {
  aberto: boolean
  onFechar: () => void
  ids: number[]
  total: number
}) {
  const [forma, setForma] = useState<'pix' | 'dinheiro' | 'debito' | 'credito'>('pix')
  const quitar = useMutation({
    mutationFn: async () => {
      const db = await getDb()
      await quitarFiados(db, ids, forma, (await caixaAberto(db))?.id ?? null)
    },
    onSuccess: () => {
      invalidarMovimento()
      toast.success(`Fiado de ${formatBRL(total)} quitado.`)
      onFechar()
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Quitar fiado</DialogTitle>
          <DialogDescription>O valor entra no caixa aberto, na forma escolhida.</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col items-center gap-5 py-4">
          <span className="font-display text-4xl font-bold tabular-nums">{formatBRL(total)}</span>
          <Segmented
            aria-label="Forma de recebimento"
            value={forma}
            onChange={setForma}
            options={(['pix', 'dinheiro', 'debito', 'credito'] as const).map((f) => ({
              value: f,
              label: labelForma(f),
            }))}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => quitar.mutate()} loading={quitar.isPending} autoFocus>
            Confirmar recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
