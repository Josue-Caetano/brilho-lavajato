import { useMutation, useQuery } from '@tanstack/react-query'
import { addDays, format, parseISO } from 'date-fns'
import { CalendarX2, CircleCheck, LoaderCircle, MessageCircle, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { qk, useConfig } from '@/app/queries'
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
import { Badge, Kbd, Segmented } from '@/components/ui/misc'
import { getDb } from '@/db'
import {
  atualizarAgendamento,
  criarAgendamento,
  listarAgendamentos,
  type Agendamento,
  type AgendamentoInput,
} from '@/db/repositories/agendamentos'
import { buscarPorPlaca } from '@/db/repositories/clientes'
import { CONFIG_PADRAO } from '@/db/repositories/configuracoes'
import { listarServicos } from '@/db/repositories/servicos'
import { horariosDoDia } from '@/lib/agenda'
import { formatarDuracao, hojeIso } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { formatBRL } from '@/lib/money'
import { precoPorTipo, TIPOS_VEICULO, type TipoVeiculo } from '@/lib/ordem'
import { formatarPlaca, mascararPlaca, normalizarPlaca, placaValida } from '@/lib/placa'
import { enterConfirma } from '@/lib/teclado'
import { formatarTelefone, normalizarTelefone, telefoneValido } from '@/lib/telefone'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import { avisarAgendamento, recarregarAgenda } from './comum'

export function AgendamentoDialog() {
  const estado = useUi((s) => s.agendamento)
  const fechar = useUi((s) => s.fecharAgendamento)
  return (
    <Dialog open={estado.aberto} onOpenChange={(o) => !o && fechar()}>
      <DialogContent size="xl" aria-describedby="ag-desc" onOpenAutoFocus={(e) => e.preventDefault()}>
        {estado.aberto && (
          <Formulario
            key={estado.editar?.id ?? 'novo'}
            editar={estado.editar ?? null}
            dataInicial={estado.data}
            horaInicial={estado.hora}
            onFechar={fechar}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface Erros {
  placa?: string
  nome?: string
  telefone?: string
  servicos?: string
  horario?: string
}

function Formulario({
  editar,
  dataInicial,
  horaInicial,
  onFechar,
}: {
  editar: Agendamento | null
  dataInicial?: string
  horaInicial?: string
  onFechar: () => void
}) {
  const { data: cfg } = useConfig()
  const regrasAgenda = cfg?.agenda ?? CONFIG_PADRAO.agenda
  const placaRef = useRef<HTMLInputElement>(null)
  const [placa, setPlaca] = useState(editar?.placa ? formatarPlaca(editar.placa) : '')
  const [nome, setNome] = useState(editar?.nome ?? '')
  const [telefone, setTelefone] = useState(formatarTelefone(editar?.telefone))
  const [modelo, setModelo] = useState(editar?.modelo ?? '')
  const [tipo, setTipo] = useState<TipoVeiculo>(editar?.tipo ?? 'carro')
  const [ids, setIds] = useState<{ cliente: number | null; veiculo: number | null }>({
    cliente: editar?.cliente_id ?? null,
    veiculo: editar?.veiculo_id ?? null,
  })
  const [servicosSel, setServicosSel] = useState<number[]>(editar?.servicos.map((s) => s.servico_id) ?? [])
  const [dia, setDia] = useState(editar?.data_hora.slice(0, 10) ?? dataInicial ?? hojeIso())
  const [hora, setHora] = useState(editar?.data_hora.slice(11, 16) ?? horaInicial ?? '')
  const [obs, setObs] = useState(editar?.observacoes ?? '')
  const [erros, setErros] = useState<Erros>({})

  useEffect(() => placaRef.current?.focus(), [])

  const { data: servicos = [] } = useQuery({
    queryKey: [...qk.servicos, 'ativos'],
    queryFn: async () => listarServicos(await getDb(), true),
  })

  // Placa conhecida: completa cliente, telefone, modelo e tipo
  const placaNorm = normalizarPlaca(placa)
  const valida = placaValida(placaNorm)
  const busca = useQuery({
    queryKey: ['placa', placaNorm, cfg?.fidelidade],
    queryFn: async () =>
      buscarPorPlaca(await getDb(), placaNorm, cfg?.fidelidade ?? { ativo: false, lavagens: 10 }),
    enabled: valida,
    staleTime: 0,
  })
  const encontrado = valida ? busca.data : null
  const [preenchido, setPreenchido] = useState<string | null>(editar?.placa ?? null)
  if (encontrado && preenchido !== encontrado.veiculo.placa) {
    setPreenchido(encontrado.veiculo.placa)
    setNome(encontrado.cliente.nome)
    setTelefone(formatarTelefone(encontrado.cliente.telefone))
    setModelo(encontrado.veiculo.modelo ?? '')
    setTipo(encontrado.veiculo.tipo)
    setIds({ cliente: encontrado.cliente.id, veiculo: encontrado.veiculo.id })
    const s = servicos.find((x) => x.nome === encontrado.servicoMaisComum)
    if (s && servicosSel.length === 0 && precoPorTipo(s, encontrado.veiculo.tipo) > 0) setServicosSel([s.id])
  }
  if (ids.veiculo !== null && (!valida || (busca.isSuccess && !encontrado))) {
    // Placa apagada ou trocada por uma sem cadastro: desliga do veículo anterior (mantém o que foi digitado)
    setIds({ cliente: null, veiculo: null })
    setPreenchido(null)
  }

  const itens = servicosSel
    .map((id) => servicos.find((s) => s.id === id))
    .filter((s) => s !== undefined)
    .map((s) => ({
      servico_id: s.id,
      nome: s.nome,
      preco_unit: precoPorTipo(s, tipo),
      duracao: s.duracao_min,
    }))
  const total = itens.reduce((a, i) => a + i.preco_unit, 0)
  const duracao = Math.max(
    regrasAgenda.intervaloMin,
    itens.reduce((a, i) => a + i.duracao, 0),
  )

  // Ocupação do dia escolhido
  const { data: doDia = [] } = useQuery({
    queryKey: [...qk.ordens, 'agenda', dia, dia],
    queryFn: async () => listarAgendamentos(await getDb(), dia, dia),
  })
  const horarios = horariosDoDia(dia, doDia, regrasAgenda, duracao, new Date(), editar?.id)
  const horarioAtual = horarios.find((h) => h.hora === hora)

  const salvar = useMutation({
    mutationFn: async () => {
      const db = await getDb()
      const dados: AgendamentoInput = {
        data_hora: `${dia}T${hora}:00`,
        duracao_min: duracao,
        cliente_id: ids.cliente,
        veiculo_id: ids.veiculo,
        nome,
        telefone: normalizarTelefone(telefone),
        placa: placaNorm,
        modelo,
        cor: encontrado?.veiculo.cor ?? editar?.cor ?? '',
        tipo,
        servicos: itens.map(({ servico_id, nome: n, preco_unit }) => ({ servico_id, nome: n, preco_unit })),
        observacoes: obs,
      }
      if (editar) await atualizarAgendamento(db, editar.id, dados)
      else await criarAgendamento(db, dados)
      return dados
    },
    onSuccess: (dados) => {
      recarregarAgenda()
      const quando = `${format(parseISO(dados.data_hora), 'dd/MM')} às ${hora}`
      const ag = { ...dados, id: editar?.id ?? 0, status: 'agendado', total, ordem_id: null } as Agendamento
      toast.success(editar ? `Agendamento atualizado: ${quando}` : `${dados.nome} agendado para ${quando}`, {
        action: dados.telefone
          ? { label: 'Confirmar no WhatsApp', onClick: () => avisarAgendamento(ag, cfg, 'agendamento') }
          : undefined,
        duration: 8000,
      })
      onFechar()
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })

  const enviar = (e?: React.FormEvent) => {
    e?.preventDefault()
    const novos: Erros = {}
    if (placa && !valida) novos.placa = 'Placa inválida — use ABC-1234 ou ABC1D23.'
    if (nome.trim().length < 2) novos.nome = 'Informe o nome do cliente.'
    if (telefone && !telefoneValido(telefone)) novos.telefone = 'Telefone incompleto.'
    if (itens.length === 0) novos.servicos = 'Escolha pelo menos um serviço.'
    if (!hora) novos.horario = 'Escolha um horário.'
    setErros(novos)
    if (Object.keys(novos).length === 0) {
      if (horarioAtual && !horarioAtual.livre && !horarioAtual.passado) {
        toast.warning('Este horário já está com todas as vagas ocupadas — agendado mesmo assim (encaixe).')
      }
      salvar.mutate()
    }
  }

  const dias = Array.from({ length: 14 }, (_, i) => format(addDays(new Date(), i), 'yyyy-MM-dd'))

  return (
    <form onSubmit={enviar} onKeyDown={enterConfirma(enviar)} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader>
        <DialogTitle>{editar ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle>
        <DialogDescription id="ag-desc">
          Placa, serviço e horário. Quando o cliente chegar, é um clique para pôr o carro na fila.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 grid-cols-3 gap-6 overflow-y-auto px-6 py-3">
        {/* Cliente e veículo */}
        <div className="flex flex-col gap-4">
          <Field
            label={
              <span className="flex items-center justify-between">
                Placa <span className="text-muted font-normal">(opcional)</span>
                <span aria-live="polite">
                  {valida && busca.isFetching && <LoaderCircle className="text-muted size-4 animate-spin" />}
                  {valida && !busca.isFetching && encontrado && (
                    <Badge tone="success">
                      <CircleCheck /> Cliente da casa
                    </Badge>
                  )}
                </span>
              </span>
            }
            htmlFor="ag-placa"
            error={erros.placa}
            hint="Sem placa agora? Dá para completar depois."
          >
            <input
              id="ag-placa"
              ref={placaRef}
              value={placa}
              onChange={(e) => {
                setPlaca(mascararPlaca(e.target.value))
                setErros((x) => ({ ...x, placa: undefined }))
              }}
              placeholder="ABC1D23"
              autoComplete="off"
              aria-invalid={!!erros.placa}
              className="border-border-strong bg-bg font-display text-text placeholder:text-muted/40 focus-visible:border-primary focus-visible:ring-primary/30 aria-[invalid=true]:border-danger h-14 w-full rounded-[var(--radius-btn)] border px-4 text-2xl font-bold tracking-[0.18em] uppercase outline-none focus-visible:ring-2"
            />
          </Field>
          <Field label="Nome do cliente" htmlFor="ag-nome" error={erros.nome}>
            <Input
              id="ag-nome"
              value={nome}
              aria-invalid={!!erros.nome}
              onChange={(e) => {
                setNome(e.target.value)
                setErros((x) => ({ ...x, nome: undefined }))
              }}
            />
          </Field>
          <Field label="WhatsApp" htmlFor="ag-tel" error={erros.telefone}>
            <Input
              id="ag-tel"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              value={telefone}
              aria-invalid={!!erros.telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Tipo</span>
            <Segmented
              aria-label="Tipo de veículo"
              value={tipo}
              onChange={setTipo}
              className="w-full [&>button]:flex-auto [&>button]:px-1.5 [&>button]:text-[13px]"
              options={TIPOS_VEICULO.map((t) => ({ value: t.value, label: t.label.split('/')[0] }))}
            />
          </div>
          <Field label="Modelo" htmlFor="ag-modelo">
            <Input
              id="ag-modelo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Ex.: Onix"
            />
          </Field>
        </div>

        {/* Serviços */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">Serviços</span>
          <ServicosGrid
            servicos={servicos}
            tipo={tipo}
            colunas={1}
            selecionados={servicosSel}
            onAlternar={(id) => {
              setErros((x) => ({ ...x, servicos: undefined }))
              setServicosSel((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]))
            }}
          />
          {erros.servicos && (
            <p role="alert" className="text-danger text-[13px]">
              {erros.servicos}
            </p>
          )}
          <Field label="Observação" htmlFor="ag-obs">
            <Textarea
              id="ag-obs"
              rows={2}
              className="min-h-16"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </Field>
        </div>

        {/* Data e horário */}
        <div className="flex flex-col gap-3">
          <Field label="Dia" htmlFor="ag-dia">
            <Input
              id="ag-dia"
              type="date"
              value={dia}
              min={editar ? undefined : hojeIso()}
              onChange={(e) => e.target.value && setDia(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-1.5" aria-label="Atalhos de dia">
            {dias.slice(0, 7).map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => setDia(d)}
                className={cn(
                  'h-9 rounded-lg border px-2.5 text-xs font-semibold transition-colors',
                  d === dia
                    ? 'border-primary bg-primary-tint text-primary'
                    : 'border-border bg-surface-2 text-muted hover:text-text',
                )}
              >
                {i === 0
                  ? 'Hoje'
                  : i === 1
                    ? 'Amanhã'
                    : format(parseISO(`${d}T12:00:00`), 'EEE dd').replace('.', '')}
              </button>
            ))}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Horário</span>
            <span className="text-muted text-xs">
              {regrasAgenda.vagas} {regrasAgenda.vagas === 1 ? 'carro' : 'carros'} por vez · serviço de{' '}
              {formatarDuracao(duracao)}
            </span>
          </div>
          {horarios.length === 0 ? (
            <p className="bg-surface-2 text-muted flex items-center gap-2 rounded-xl p-3 text-sm">
              <CalendarX2 className="size-4" /> Fechado neste dia.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Horários">
              {horarios
                .filter((h) => !h.passado || h.hora === hora)
                .map((h) => {
                  const sel = h.hora === hora
                  return (
                    <button
                      key={h.hora}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      title={
                        h.livre
                          ? `${h.ocupados} de ${regrasAgenda.vagas} vagas ocupadas`
                          : 'Lotado — dá para encaixar mesmo assim'
                      }
                      onClick={() => {
                        setHora(h.hora)
                        setErros((x) => ({ ...x, horario: undefined }))
                      }}
                      className={cn(
                        'flex h-11 flex-col items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-colors',
                        sel
                          ? 'border-primary bg-primary text-primary-foreground'
                          : h.livre
                            ? 'border-border bg-surface-2 hover:border-primary/60'
                            : 'border-border text-muted bg-transparent line-through opacity-60',
                      )}
                    >
                      {h.hora}
                    </button>
                  )
                })}
            </div>
          )}
          {erros.horario && (
            <p role="alert" className="text-danger text-[13px]">
              {erros.horario}
            </p>
          )}
          {horarios.length > 0 && horarios.every((h) => h.passado) && (
            <p className="text-muted text-sm">O expediente de hoje já terminou. Escolha outro dia.</p>
          )}
        </div>
      </div>

      <DialogFooter className="justify-between">
        <div>
          <p className="text-muted text-xs">Valor previsto</p>
          <p className="font-display text-2xl font-bold tabular-nums">{formatBRL(total)}</p>
        </div>
        <div className="flex items-center gap-3">
          {editar && editar.telefone && (
            <Button variant="whatsapp" onClick={() => avisarAgendamento(editar, cfg, 'agendamento')}>
              <MessageCircle /> Enviar confirmação
            </Button>
          )}
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="lg" loading={salvar.isPending}>
            {editar ? (
              'Salvar'
            ) : (
              <>
                <Plus /> Agendar
              </>
            )}
            <Kbd className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
              Enter
            </Kbd>
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
