import { useMutation, useQuery } from '@tanstack/react-query'
import { Banknote, CreditCard, Gift, HandCoins, QrCode, Trash2, TriangleAlert, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { invalidarMovimento, qk, useConfig } from '@/app/queries'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { MoneyInput } from '@/components/MoneyInput'
import { PlateChip } from '@/components/PlateChip'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge, Kbd, Segmented, Skeleton } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { getDb } from '@/db'
import { caixaAberto } from '@/db/repositories/caixa'
import { contagemFidelidade } from '@/db/repositories/clientes'
import { entregarOrdem, obterOrdem, type OrdemFila } from '@/db/repositories/ordens'
import { mensagemErro } from '@/lib/erros'
import { enterConfirma } from '@/lib/teclado'
import { progressoFidelidade } from '@/lib/fidelidade'
import { formatBRL } from '@/lib/money'
import {
  calcularTotais,
  FORMAS_PAGAMENTO,
  resumirPagamento,
  type Desconto,
  type FormaPagamento,
  type ParcelaPagamento,
} from '@/lib/ordem'
import { formatarPlaca } from '@/lib/placa'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'

const ICONE_FORMA: Record<FormaPagamento, React.ComponentType<{ className?: string }>> = {
  pix: QrCode,
  dinheiro: Banknote,
  debito: CreditCard,
  credito: CreditCard,
  fiado: HandCoins,
}

export function PagamentoDialog() {
  const id = useUi((s) => s.pagamentoOrdemId)
  const fechar = useUi((s) => s.fecharPagamento)
  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && fechar()}>
      <DialogContent size="lg" aria-describedby={undefined}>
        {id !== null && <PagamentoConteudo ordemId={id} onFechar={fechar} />}
      </DialogContent>
    </Dialog>
  )
}

function PagamentoConteudo({ ordemId, onFechar }: { ordemId: number; onFechar: () => void }) {
  const { data: cfg } = useConfig()
  const { data, isLoading } = useQuery({
    queryKey: [...qk.ordens, 'pagamento', ordemId],
    queryFn: async () => {
      const db = await getDb()
      const ordem = await obterOrdem(db, ordemId)
      if (!ordem) throw new Error('Ordem não encontrada.')
      return { ordem, fid: await contagemFidelidade(db, ordem.cliente_id), caixa: await caixaAberto(db) }
    },
    staleTime: 0,
  })
  if (isLoading || !data || !cfg) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }
  const premio = progressoFidelidade(data.fid.pagas, data.fid.cortesias, cfg.fidelidade).premioDisponivel
  return (
    <PagamentoForm
      ordem={data.ordem}
      premio={premio}
      caixaId={data.caixa?.id ?? null}
      perguntarImpressao={cfg.impressao.perguntarAoEntregar}
      onFechar={onFechar}
    />
  )
}

let seq = 0

function PagamentoForm({
  ordem,
  premio,
  caixaId,
  perguntarImpressao,
  onFechar,
}: {
  ordem: OrdemFila
  premio: boolean
  caixaId: number | null
  perguntarImpressao: boolean
  onFechar: () => void
}) {
  const [cortesia, setCortesia] = useState(premio)
  const [tipoDesc, setTipoDesc] = useState<'valor' | 'percentual'>('valor')
  const [descValor, setDescValor] = useState(0)
  const [descPct, setDescPct] = useState('')
  const [parcelas, setParcelas] = useState<(ParcelaPagamento & { key: number })[]>([])
  const [imprimir, setImprimir] = useState(perguntarImpressao)

  const desconto: Desconto | null =
    tipoDesc === 'valor'
      ? descValor > 0
        ? { tipo: 'valor', valor: descValor }
        : null
      : descPct
        ? { tipo: 'percentual', valor: Number(descPct.replace(',', '.')) || 0 }
        : null
  const totais = calcularTotais(ordem.itens, desconto, cortesia)
  const resumo = resumirPagamento(totais.total, parcelas)

  const adicionar = (forma: FormaPagamento) => {
    setParcelas((ps) => {
      const existente = ps.find((p) => p.forma === forma)
      if (existente) return ps
      const pago = ps.reduce((a, p) => a + p.valor, 0)
      return [...ps, { key: ++seq, forma, valor: Math.max(0, totais.total - pago) }]
    })
  }

  const entregar = useMutation({
    mutationFn: async () => {
      const db = await getDb()
      await entregarOrdem(db, {
        ordemId: ordem.id,
        subtotal: totais.subtotal,
        desconto: totais.desconto + totais.cortesia,
        total: totais.total,
        cortesia: cortesia && totais.cortesia > 0,
        pagamentos: (Object.entries(resumo.porForma) as [FormaPagamento, number][]).map(([forma, valor]) => ({
          forma,
          valor,
        })),
        caixaId,
      })
    },
    onSuccess: () => {
      invalidarMovimento()
      toast.success(`${formatarPlaca(ordem.placa)} entregue`, {
        description: `${formatBRL(totais.total)}${resumo.troco > 0 ? ` · troco ${formatBRL(resumo.troco)}` : ''}`,
      })
      onFechar()
      if (imprimir) useUi.getState().abrirComprovante(ordem.id)
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })

  const podeConfirmar = resumo.valido && !entregar.isPending
  const fiado = parcelas.some((p) => p.forma === 'fiado' && p.valor > 0)

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        if (podeConfirmar) entregar.mutate()
      }}
      onKeyDown={enterConfirma(() => podeConfirmar && entregar.mutate())}
    >
      <DialogHeader>
        <DialogTitle>Entregar e cobrar</DialogTitle>
        <DialogDescription asChild>
          <div className="flex items-center gap-2 pt-1">
            <PlateChip placa={ordem.placa} size="sm" />
            <span>
              {ordem.cliente_nome}
              {ordem.modelo ? ` · ${ordem.modelo}` : ''}
            </span>
          </div>
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-y-auto px-6 py-3">
        {/* Resumo e descontos */}
        <div className="flex flex-col gap-4">
          {premio && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-[14px] border p-3.5 transition-colors',
                cortesia ? 'border-success/40 bg-success-tint' : 'border-border bg-surface-2',
              )}
            >
              <span className="bg-success text-primary-foreground flex size-10 items-center justify-center rounded-full">
                <Gift className="size-5" />
              </span>
              <span className="flex-1">
                <span className="font-display text-success block font-semibold">Lavagem grátis!</span>
                <span className="text-muted text-sm">Cliente completou o cartão fidelidade.</span>
              </span>
              <Switch checked={cortesia} onCheckedChange={setCortesia} aria-label="Aplicar lavagem grátis" />
            </div>
          )}
          <ul className="divide-border border-border flex flex-col divide-y rounded-[14px] border">
            {ordem.itens.map((i) => (
              <li key={i.id} className="flex justify-between px-4 py-2.5 text-[15px]">
                <span>{i.nome}</span>
                <span className="tabular-nums">{formatBRL(i.preco_unit * i.quantidade)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Desconto</span>
            <div className="flex gap-2">
              <Segmented
                aria-label="Tipo de desconto"
                value={tipoDesc}
                onChange={setTipoDesc}
                options={[
                  { value: 'valor', label: 'R$' },
                  { value: 'percentual', label: '%' },
                ]}
              />
              <div className="flex-1">
                {tipoDesc === 'valor' ? (
                  <MoneyInput aria-label="Desconto em reais" value={descValor} onValueChange={setDescValor} />
                ) : (
                  <div className="relative">
                    <Input
                      aria-label="Desconto em percentual"
                      inputMode="decimal"
                      className="pr-9 text-right"
                      value={descPct}
                      onChange={(e) => setDescPct(e.target.value.replace(/[^\d,]/g, '').slice(0, 5))}
                      placeholder="0"
                    />
                    <span className="text-muted absolute top-1/2 right-3.5 -translate-y-1/2">%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <dl className="bg-surface-2 mt-auto flex flex-col gap-1.5 rounded-[14px] p-4 text-[15px]">
            <div className="text-muted flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatBRL(totais.subtotal)}</dd>
            </div>
            {totais.cortesia > 0 && (
              <div className="text-success flex justify-between">
                <dt>Lavagem grátis</dt>
                <dd className="tabular-nums">− {formatBRL(totais.cortesia)}</dd>
              </div>
            )}
            {totais.desconto > 0 && (
              <div className="text-muted flex justify-between">
                <dt>Desconto</dt>
                <dd className="tabular-nums">− {formatBRL(totais.desconto)}</dd>
              </div>
            )}
            <div className="border-border mt-1 flex items-baseline justify-between border-t pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-[28px] font-bold tabular-nums">
                <AnimatedNumber value={totais.total} format={formatBRL} duration={250} />
              </dd>
            </div>
          </dl>
        </div>

        {/* Formas de pagamento */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Forma de pagamento</span>
            <div className="grid grid-cols-5 gap-2">
              {FORMAS_PAGAMENTO.map((f) => {
                const Icone = ICONE_FORMA[f.value]
                const ativa = parcelas.some((p) => p.forma === f.value)
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => adicionar(f.value)}
                    aria-pressed={ativa}
                    disabled={totais.total === 0}
                    className={cn(
                      'flex h-[68px] flex-col items-center justify-center gap-1 rounded-[14px] border text-sm font-medium transition-colors duration-150 disabled:opacity-40',
                      ativa
                        ? 'border-primary bg-primary-tint text-primary'
                        : 'border-border bg-surface-2 text-text hover:border-border-strong',
                    )}
                  >
                    <Icone className="size-5" />
                    {f.label}
                  </button>
                )
              })}
            </div>
            <p className="text-muted text-xs">Toque em mais de uma forma para dividir o pagamento.</p>
          </div>

          {parcelas.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {parcelas.map((p) => {
                const Icone = ICONE_FORMA[p.forma]
                const label = FORMAS_PAGAMENTO.find((f) => f.value === p.forma)!.label
                return (
                  <li key={p.key} className="animate-slide-up flex items-center gap-2">
                    <span className="flex h-11 w-32 shrink-0 items-center gap-2 text-[15px] font-medium">
                      <Icone className="text-muted size-4" />
                      {p.forma === 'dinheiro' ? 'Recebido' : label}
                    </span>
                    <div className="flex-1">
                      <MoneyInput
                        aria-label={`Valor em ${label}`}
                        value={p.valor}
                        autoFocus={p.forma === 'dinheiro'}
                        onValueChange={(v) =>
                          setParcelas((ps) => ps.map((x) => (x.key === p.key ? { ...x, valor: v } : x)))
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${label}`}
                      onClick={() => setParcelas((ps) => ps.filter((x) => x.key !== p.key))}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            totais.total > 0 && (
              <div className="border-border text-muted flex flex-col items-center gap-2 rounded-[14px] border border-dashed py-6 text-center text-sm">
                <Wallet className="size-5" />
                Escolha como o cliente vai pagar.
              </div>
            )
          )}

          {fiado && (
            <p className="border-warning/25 bg-warning-tint text-warning rounded-lg border px-3 py-2 text-sm">
              O valor no fiado fica em aberto na ficha de {ordem.cliente_nome}.
            </p>
          )}

          <div className="mt-auto flex flex-col gap-3">
            {resumo.troco > 0 && (
              <div className="animate-pop-in border-success/40 bg-success-tint flex items-baseline justify-between rounded-[14px] border px-4 py-3">
                <span className="text-success font-semibold">Troco</span>
                <span className="font-display text-success text-2xl font-bold tabular-nums">
                  {formatBRL(resumo.troco)}
                </span>
              </div>
            )}
            {resumo.restante > 0 && parcelas.length > 0 && (
              <div className="bg-surface-2 flex items-baseline justify-between rounded-[14px] px-4 py-3">
                <span className="text-muted">Falta receber</span>
                <span className="font-display text-xl font-semibold tabular-nums">
                  {formatBRL(resumo.restante)}
                </span>
              </div>
            )}
            {resumo.erro && parcelas.length > 0 && resumo.restante === 0 && (
              <p className="text-danger text-sm">{resumo.erro}</p>
            )}
            {caixaId === null && (
              <p className="text-warning flex items-start gap-2 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />O caixa está fechado: este recebimento não
                entrará na conferência de nenhum caixa.
              </p>
            )}
          </div>
        </div>
      </div>

      <DialogFooter className="justify-between">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <Switch checked={imprimir} onCheckedChange={setImprimir} aria-label="Imprimir comprovante" />
          Imprimir comprovante
        </label>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!podeConfirmar}
            loading={entregar.isPending}
          >
            Confirmar entrega
            {totais.total === 0 && (
              <Badge className="border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground">
                Grátis
              </Badge>
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
