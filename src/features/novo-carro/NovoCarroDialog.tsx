import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CircleAlert,
  CircleCheck,
  Gift,
  History,
  LoaderCircle,
  Phone,
  Plus,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { invalidarMovimento, qk, useConfig } from '@/app/queries'
import { PlateChip } from '@/components/PlateChip'
import { ServicosGrid } from '@/components/ServicosGrid'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Badge, Kbd, Progress, Segmented } from '@/components/ui/misc'
import { getDb } from '@/db'
import { buscarClientes, buscarPorPlaca, type Cliente } from '@/db/repositories/clientes'
import { criarOrdem } from '@/db/repositories/ordens'
import { listarServicos } from '@/db/repositories/servicos'
import { formatarData } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { enterConfirma } from '@/lib/teclado'
import { formatBRL } from '@/lib/money'
import { precoPorTipo, TIPOS_VEICULO, type TipoVeiculo } from '@/lib/ordem'
import { formatarPlaca, mascararPlaca, normalizarPlaca, placaValida } from '@/lib/placa'
import { formatarTelefone, normalizarTelefone, telefoneValido } from '@/lib/telefone'
import { cn } from '@/lib/utils'
import { useSessao } from '@/stores/sessao'
import { useUi } from '@/stores/ui'

const CORES = ['Branco', 'Preto', 'Prata', 'Cinza', 'Vermelho', 'Azul']

export function NovoCarroDialog() {
  const aberto = useUi((s) => s.novoCarro)
  const fechar = useUi((s) => s.fecharNovoCarro)
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && fechar()}>
      <DialogContent size="lg" aria-describedby="novo-carro-desc" onOpenAutoFocus={(e) => e.preventDefault()}>
        {aberto && <NovoCarroForm onFechar={fechar} />}
      </DialogContent>
    </Dialog>
  )
}

interface Erros {
  placa?: string
  nome?: string
  telefone?: string
  servicos?: string
}

function NovoCarroForm({ onFechar }: { onFechar: () => void }) {
  const { data: cfg } = useConfig()
  const usuario = useSessao((s) => s.usuario)
  const navigate = useNavigate()
  const placaRef = useRef<HTMLInputElement>(null)

  const [placa, setPlaca] = useState('')
  const [tipo, setTipo] = useState<TipoVeiculo>('carro')
  const [modelo, setModelo] = useState('')
  const [cor, setCor] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null)
  const [servicosSel, setServicosSel] = useState<number[]>([])
  const [obs, setObs] = useState('')
  const [mostrarObs, setMostrarObs] = useState(false)
  const [erros, setErros] = useState<Erros>({})

  useEffect(() => placaRef.current?.focus(), [])

  const placaNorm = normalizarPlaca(placa)
  const valida = placaValida(placaNorm)
  const regra = cfg?.fidelidade ?? { ativo: false, lavagens: 10 }

  const { data: servicos = [] } = useQuery({
    queryKey: [...qk.servicos, 'ativos'],
    queryFn: async () => listarServicos(await getDb(), true),
  })
  const busca = useQuery({
    queryKey: ['placa', placaNorm, regra],
    queryFn: async () => buscarPorPlaca(await getDb(), placaNorm, regra),
    enabled: valida,
    staleTime: 0,
  })
  const encontrado = valida ? busca.data : null
  const tipoEfetivo = encontrado?.veiculo.tipo ?? tipo

  // Veículo conhecido: pré-seleciona o serviço que ele mais faz (ajuste de estado durante a renderização).
  const [preSelecionado, setPreSelecionado] = useState<string | null>(null)
  if (encontrado && servicos.length > 0 && preSelecionado !== encontrado.veiculo.placa) {
    setPreSelecionado(encontrado.veiculo.placa)
    const s = servicos.find((x) => x.nome === encontrado.servicoMaisComum)
    if (s && precoPorTipo(s, encontrado.veiculo.tipo) > 0) setServicosSel([s.id])
  }

  const itens = useMemo(
    () =>
      servicosSel
        .map((id) => servicos.find((s) => s.id === id))
        .filter((s) => s !== undefined)
        .map((s) => ({
          servico_id: s.id,
          nome: s.nome,
          preco_unit: precoPorTipo(s, tipoEfetivo),
          quantidade: 1,
        })),
    [servicosSel, servicos, tipoEfetivo],
  )
  const total = itens.reduce((a, i) => a + i.preco_unit, 0)

  const salvar = useMutation({
    mutationFn: async () => {
      const db = await getDb()
      return criarOrdem(db, {
        veiculoId: encontrado?.veiculo.id,
        clienteId: encontrado?.cliente.id ?? clienteExistente?.id,
        novoCliente:
          encontrado || clienteExistente ? undefined : { nome, telefone: normalizarTelefone(telefone) },
        novoVeiculo: encontrado ? undefined : { placa: placaNorm, modelo, cor, tipo },
        itens,
        observacoes: obs.trim(),
        funcionarioId: usuario?.id ?? null,
      })
    },
    onSuccess: () => {
      invalidarMovimento()
      toast.success(`${formatarPlaca(placaNorm)} entrou na fila`, {
        description: `${itens.map((i) => i.nome).join(' + ')} · ${formatBRL(total)}`,
        action: { label: 'Ver fila', onClick: () => navigate('/fila') },
      })
      onFechar()
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })

  const enviar = (e?: React.FormEvent) => {
    e?.preventDefault()
    const novos: Erros = {}
    if (!valida) novos.placa = 'Placa inválida — use ABC-1234 ou ABC1D23.'
    if (valida && !encontrado && !clienteExistente) {
      if (nome.trim().length < 2) novos.nome = 'Informe o nome do cliente.'
      if (telefone && !telefoneValido(telefone)) novos.telefone = 'Telefone incompleto.'
    }
    if (itens.length === 0) novos.servicos = 'Escolha pelo menos um serviço.'
    setErros(novos)
    if (Object.keys(novos).length === 0 && !busca.isFetching) salvar.mutate()
  }

  const alternarServico = (id: number) => {
    setErros((e) => ({ ...e, servicos: undefined }))
    setServicosSel((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]))
  }

  return (
    <form onSubmit={enviar} onKeyDown={enterConfirma(enviar)} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader>
        <DialogTitle>Novo carro</DialogTitle>
        <DialogDescription id="novo-carro-desc">
          Comece pela placa: se o carro já veio antes, o resto a gente completa.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 overflow-y-auto px-6 py-3">
        {/* Coluna da esquerda: placa, veículo e cliente */}
        <div className="flex flex-col gap-4">
          <Field
            label={
              <span className="flex items-center justify-between">
                Placa
                <span aria-live="polite">
                  {valida && busca.isFetching && <LoaderCircle className="text-muted size-4 animate-spin" />}
                  {valida && !busca.isFetching && encontrado && (
                    <Badge tone="success">
                      <CircleCheck /> Cliente da casa
                    </Badge>
                  )}
                  {valida && !busca.isFetching && !encontrado && busca.isSuccess && (
                    <Badge tone="primary">
                      <Plus /> Carro novo
                    </Badge>
                  )}
                </span>
              </span>
            }
            htmlFor="nc-placa"
            error={erros.placa}
          >
            <input
              id="nc-placa"
              ref={placaRef}
              value={placa}
              onChange={(e) => {
                setPlaca(mascararPlaca(e.target.value))
                setErros((x) => ({ ...x, placa: undefined }))
              }}
              placeholder="ABC1D23"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!erros.placa}
              className="border-border-strong bg-bg font-display text-text placeholder:text-muted/40 focus-visible:border-primary focus-visible:ring-primary/30 aria-[invalid=true]:border-danger h-16 w-full rounded-[var(--radius-btn)] border px-4 text-[28px] font-bold tracking-[0.2em] uppercase outline-none focus-visible:ring-2"
            />
          </Field>

          {encontrado ? (
            <div className="animate-slide-up border-border bg-surface-2 flex flex-col gap-3 rounded-[14px] border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display truncate text-lg font-semibold">{encontrado.cliente.nome}</p>
                  <p className="text-muted text-sm">
                    {[encontrado.veiculo.modelo, encontrado.veiculo.cor].filter(Boolean).join(' · ') ||
                      'Veículo'}
                    {' · '}
                    {TIPOS_VEICULO.find((t) => t.value === encontrado.veiculo.tipo)?.label}
                  </p>
                </div>
                {encontrado.cliente.telefone && (
                  <span className="text-muted flex shrink-0 items-center gap-1 text-sm">
                    <Phone className="size-3.5" /> {formatarTelefone(encontrado.cliente.telefone)}
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted flex items-center gap-1">
                    <History className="size-3.5" /> Última visita
                  </dt>
                  <dd className="font-medium">
                    {encontrado.ultimaVisita ? formatarData(encontrado.ultimaVisita) : 'Primeira vez'}
                    {encontrado.visitas > 0 && (
                      <span className="text-muted"> · {encontrado.visitas} visitas</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted flex items-center gap-1">
                    <Sparkles className="size-3.5" /> Mais pedido
                  </dt>
                  <dd className="truncate font-medium">{encontrado.servicoMaisComum ?? '—'}</dd>
                </div>
              </dl>
              {regra.ativo && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted flex items-center gap-1">
                      <Gift className="size-3.5" /> Fidelidade
                    </span>
                    <span className="font-medium tabular-nums">
                      {encontrado.fidelidade.atual}/{encontrado.fidelidade.meta}
                    </span>
                  </div>
                  <Progress
                    value={encontrado.fidelidade.atual}
                    max={encontrado.fidelidade.meta}
                    tone={encontrado.fidelidade.faltam <= 1 ? 'success' : 'primary'}
                    label="Progresso da fidelidade"
                  />
                  {encontrado.fidelidade.premioDisponivel && (
                    <Badge tone="success" className="mt-1 self-start">
                      <Gift /> Esta lavagem é grátis!
                    </Badge>
                  )}
                </div>
              )}
              {encontrado.cliente.observacoes && (
                <p className="border-warning/25 bg-warning-tint text-warning flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" /> {encontrado.cliente.observacoes}
                </p>
              )}
              {encontrado.fiadoAberto > 0 && (
                <p className="text-warning text-sm">Fiado em aberto: {formatBRL(encontrado.fiadoAberto)}</p>
              )}
              {encontrado.naFila && (
                <p className="text-warning flex items-center gap-2 text-sm font-medium">
                  <CircleAlert className="size-4" /> Este carro já está na fila.
                </p>
              )}
            </div>
          ) : (
            <div className={cn('flex flex-col gap-4 transition-opacity', !valida && 'opacity-60')}>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Tipo</span>
                <Segmented
                  aria-label="Tipo de veículo"
                  value={tipo}
                  onChange={setTipo}
                  className="w-full [&>button]:flex-auto [&>button]:px-2"
                  options={TIPOS_VEICULO.map((t) => ({ value: t.value, label: t.label.split('/')[0] }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Modelo" htmlFor="nc-modelo">
                  <Input
                    id="nc-modelo"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ex.: Onix"
                  />
                </Field>
                <Field label="Cor" htmlFor="nc-cor">
                  <Input
                    id="nc-cor"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    placeholder="Ex.: Prata"
                    list="nc-cores"
                  />
                  <datalist id="nc-cores">
                    {CORES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
              </div>
              <ClienteCampos
                nome={nome}
                telefone={telefone}
                setNome={(v) => {
                  setNome(v)
                  setErros((x) => ({ ...x, nome: undefined }))
                }}
                setTelefone={setTelefone}
                existente={clienteExistente}
                setExistente={setClienteExistente}
                erros={erros}
              />
            </div>
          )}
        </div>

        {/* Coluna da direita: serviços */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Serviços</span>
            <span className="text-muted text-xs">
              Preços para {TIPOS_VEICULO.find((t) => t.value === tipoEfetivo)?.label.toLowerCase()}
            </span>
          </div>
          <ServicosGrid
            servicos={servicos}
            tipo={tipoEfetivo}
            selecionados={servicosSel}
            onAlternar={alternarServico}
          />
          {erros.servicos && (
            <p role="alert" className="text-danger text-[13px]">
              {erros.servicos}
            </p>
          )}
          {mostrarObs ? (
            <Field label="Observação desta lavagem" htmlFor="nc-obs">
              <Textarea
                id="nc-obs"
                rows={2}
                className="min-h-16"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex.: cliente volta às 17h"
                autoFocus
              />
            </Field>
          ) : (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setMostrarObs(true)}>
              <Plus /> Adicionar observação
            </Button>
          )}
        </div>
      </div>

      <DialogFooter className="justify-between">
        <div>
          <p className="text-muted text-xs">Total</p>
          <p className="font-display text-2xl font-bold tabular-nums">{formatBRL(total)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="lg" loading={salvar.isPending} className="px-6">
            Colocar na fila{' '}
            <Kbd className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
              Enter
            </Kbd>
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

function ClienteCampos({
  nome,
  telefone,
  setNome,
  setTelefone,
  existente,
  setExistente,
  erros,
}: {
  nome: string
  telefone: string
  setNome: (v: string) => void
  setTelefone: (v: string) => void
  existente: Cliente | null
  setExistente: (c: Cliente | null) => void
  erros: Erros
}) {
  const [focado, setFocado] = useState(false)
  const termo = nome.trim()
  const { data: sugestoes = [] } = useQuery({
    queryKey: ['buscar-clientes', termo],
    queryFn: async () => buscarClientes(await getDb(), termo, 5),
    enabled: termo.length >= 2 && !existente,
  })

  if (existente) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Cliente</span>
        <div className="border-primary/40 bg-primary-tint flex items-center gap-3 rounded-[var(--radius-btn)] border px-3.5 py-2.5">
          <UserRound className="text-primary size-4" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{existente.nome}</span>
            <span className="text-muted text-xs">
              {formatarTelefone(existente.telefone) || 'Sem telefone'}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setExistente(null)}
            className="text-muted hover:bg-surface-2 inline-flex size-9 items-center justify-center rounded-lg"
            aria-label="Trocar cliente"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-muted text-xs">O veículo será cadastrado para este cliente.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Nome do cliente" htmlFor="nc-nome" error={erros.nome} className="relative">
        <Input
          id="nc-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onFocus={() => setFocado(true)}
          onBlur={() => setTimeout(() => setFocado(false), 150)}
          placeholder="Nome ou busque um cliente"
          autoComplete="off"
          aria-invalid={!!erros.nome}
        />
        {focado && sugestoes.length > 0 && (
          <ul
            className="border-border-strong bg-surface shadow-pop absolute top-[72px] right-0 left-0 z-10 overflow-hidden rounded-[var(--radius-btn)] border"
            role="listbox"
            aria-label="Clientes cadastrados"
          >
            {sugestoes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="hover:bg-surface-2 flex w-full flex-col items-start px-3.5 py-2 text-left"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setExistente(c)}
                >
                  <span className="text-sm font-semibold">{c.nome}</span>
                  <span className="text-muted flex items-center gap-2 text-xs">
                    {formatarTelefone(c.telefone)}
                    {c.placas
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => (
                        <PlateChip key={p} placa={p} size="sm" />
                      ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>
      <Field label="WhatsApp" htmlFor="nc-tel" error={erros.telefone}>
        <Input
          id="nc-tel"
          value={telefone}
          onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          placeholder="(11) 99999-9999"
          inputMode="tel"
          aria-invalid={!!erros.telefone}
        />
      </Field>
    </div>
  )
}
