import { useMutation } from '@tanstack/react-query'
import { CircleCheck, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { invalidarMovimento } from '@/app/queries'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getDb } from '@/db'
import {
  CATEGORIAS_DESPESA,
  fecharCaixa,
  lancarDespesa,
  lancarMovimento,
  type ResumoCaixa,
  type TipoMovimento,
} from '@/db/repositories/caixa'
import { conferirCaixa, esperadoPorForma, FORMAS_CAIXA, type FormaCaixa } from '@/lib/caixa'
import { agoraIso, hojeIso } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { formatBRL } from '@/lib/money'
import { labelForma } from '@/lib/ordem'
import { enterConfirma } from '@/lib/teclado'
import { cn } from '@/lib/utils'

const TEXTOS: Record<'sangria' | 'suprimento', { titulo: string; desc: string; placeholder: string }> = {
  sangria: {
    titulo: 'Sangria',
    desc: 'Retirada de dinheiro da gaveta (ex.: depósito no banco).',
    placeholder: 'Ex.: depósito no banco',
  },
  suprimento: {
    titulo: 'Suprimento',
    desc: 'Dinheiro colocado na gaveta (ex.: reforço de troco).',
    placeholder: 'Ex.: reforço de troco',
  },
}

export function MovimentoDialog({
  tipo,
  caixaId,
  onFechar,
}: {
  tipo: 'sangria' | 'suprimento' | null
  caixaId: number
  onFechar: () => void
}) {
  const [valor, setValor] = useState(0)
  const [descricao, setDescricao] = useState('')
  const salvar = useMutation({
    mutationFn: async () => lancarMovimento(await getDb(), caixaId, tipo as TipoMovimento, valor, descricao),
    onSuccess: () => {
      invalidarMovimento()
      toast.success(`${TEXTOS[tipo!].titulo} de ${formatBRL(valor)} lançada.`)
      setValor(0)
      setDescricao('')
      onFechar()
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })
  const t = tipo ? TEXTOS[tipo] : null
  return (
    <Dialog open={tipo !== null} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent size="sm">
        {t && (
          <form
            className="flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault()
              if (valor > 0) salvar.mutate()
            }}
          >
            <DialogHeader>
              <DialogTitle>{t.titulo}</DialogTitle>
              <DialogDescription>{t.desc}</DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              <Field label="Valor" htmlFor="mv-valor">
                <MoneyInput
                  id="mv-valor"
                  autoFocus
                  value={valor}
                  onValueChange={setValor}
                  className="h-14 text-xl"
                />
              </Field>
              <Field label="Descrição" htmlFor="mv-desc">
                <Input
                  id="mv-desc"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder={t.placeholder}
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={onFechar}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={valor <= 0} loading={salvar.isPending}>
                Lançar {t.titulo.toLowerCase()}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function DespesaDialog({
  aberto,
  caixaId,
  onFechar,
}: {
  aberto: boolean
  caixaId: number | null
  onFechar: () => void
}) {
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<string>('Produtos')
  const [valor, setValor] = useState(0)
  const [data, setData] = useState(hojeIso())
  const [daGaveta, setDaGaveta] = useState(caixaId !== null)
  const salvar = useMutation({
    mutationFn: async () => {
      const quando = data === hojeIso() ? agoraIso() : `${data}T12:00:00`
      await lancarDespesa(await getDb(), {
        descricao,
        categoria,
        valor,
        data: quando,
        caixaId: daGaveta ? caixaId : null,
      })
    },
    onSuccess: () => {
      invalidarMovimento()
      toast.success('Despesa lançada.')
      setDescricao('')
      setValor(0)
      onFechar()
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })
  const valido = descricao.trim().length > 1 && valor > 0
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent size="sm">
        <form
          className="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (valido) salvar.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>Nova despesa</DialogTitle>
            <DialogDescription>Entra no relatório de lucro estimado.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field label="Descrição" htmlFor="dp-desc">
              <Input
                id="dp-desc"
                autoFocus
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: shampoo 20 L"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria" htmlFor="dp-cat">
                <Select
                  id="dp-cat"
                  value={categoria}
                  onValueChange={setCategoria}
                  options={CATEGORIAS_DESPESA.map((c) => ({ value: c, label: c }))}
                />
              </Field>
              <Field label="Data" htmlFor="dp-data">
                <Input id="dp-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </Field>
            </div>
            <Field label="Valor" htmlFor="dp-valor">
              <MoneyInput id="dp-valor" value={valor} onValueChange={setValor} />
            </Field>
            {caixaId !== null && (
              <label className="flex items-center gap-3 text-sm">
                <Switch
                  checked={daGaveta}
                  onCheckedChange={setDaGaveta}
                  aria-label="Pago com dinheiro do caixa"
                />
                Paga com dinheiro da gaveta (sai do caixa aberto)
              </label>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={!valido} loading={salvar.isPending}>
              Lançar despesa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FechamentoDialog({
  aberto,
  resumo,
  onFechar,
}: {
  aberto: boolean
  resumo: ResumoCaixa
  onFechar: () => void
}) {
  const esperado = esperadoPorForma(resumo.movimentos)
  const [informado, setInformado] = useState<Record<FormaCaixa, number>>(() => ({
    dinheiro: 0,
    pix: esperado.pix,
    debito: esperado.debito,
    credito: esperado.credito,
  }))
  const [obs, setObs] = useState('')
  const conf = conferirCaixa(resumo.movimentos, informado)
  const fechar = useMutation({
    mutationFn: async () => fecharCaixa(await getDb(), resumo.caixa.id, informado, obs),
    onSuccess: (c) => {
      invalidarMovimento()
      toast.success(
        c.diferenca === 0
          ? 'Caixa fechado. Tudo bateu!'
          : `Caixa fechado com ${c.diferenca > 0 ? 'sobra' : 'falta'} de ${formatBRL(Math.abs(c.diferenca))}.`,
      )
      onFechar()
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent size="lg">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            fechar.mutate()
          }}
          onKeyDown={enterConfirma(() => fechar.mutate())}
        >
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
            <DialogDescription>
              Conte o dinheiro da gaveta e confira os totais das maquininhas e do Pix.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div className="border-border overflow-hidden rounded-[14px] border">
              <div className="border-border bg-surface-2 text-muted grid grid-cols-[1fr_130px_190px_140px] gap-3 border-b px-4 py-2 text-xs font-semibold tracking-wide uppercase">
                <span>Forma</span>
                <span className="text-right">Esperado</span>
                <span className="text-right">Informado</span>
                <span className="text-right">Diferença</span>
              </div>
              {conf.linhas.map((l) => (
                <div
                  key={l.forma}
                  className="border-border grid grid-cols-[1fr_130px_190px_140px] items-center gap-3 border-b px-4 py-2 last:border-0"
                >
                  <span className="font-medium">
                    {l.forma === 'dinheiro' ? 'Dinheiro na gaveta' : labelForma(l.forma)}
                  </span>
                  <span className="text-muted text-right tabular-nums">{formatBRL(l.esperado)}</span>
                  <MoneyInput
                    aria-label={`Valor informado em ${labelForma(l.forma)}`}
                    autoFocus={l.forma === 'dinheiro'}
                    value={informado[l.forma]}
                    onValueChange={(v) => setInformado((x) => ({ ...x, [l.forma]: v }))}
                  />
                  <Diferenca valor={l.diferenca} />
                </div>
              ))}
            </div>
            <div
              className={cn(
                'flex items-center justify-between rounded-[14px] border px-4 py-3',
                conf.diferenca === 0
                  ? 'border-success/40 bg-success-tint'
                  : conf.diferenca < 0
                    ? 'border-danger/40 bg-danger-tint'
                    : 'border-warning/40 bg-warning-tint',
              )}
              role="status"
            >
              <span className="font-semibold">
                {conf.diferenca === 0
                  ? 'Caixa batendo'
                  : conf.diferenca < 0
                    ? 'Falta no caixa'
                    : 'Sobra no caixa'}
              </span>
              <span className="font-display text-2xl font-bold tabular-nums">
                {conf.diferenca === 0 ? formatBRL(conf.informadoTotal) : formatBRL(Math.abs(conf.diferenca))}
              </span>
            </div>
            {resumo.fiadoLancado > 0 && (
              <p className="text-muted text-sm">
                Fiado lançado neste caixa (não entra na conferência): {formatBRL(resumo.fiadoLancado)}
              </p>
            )}
            <Field label="Observações (opcional)" htmlFor="fc-obs">
              <Textarea
                id="fc-obs"
                rows={2}
                className="min-h-16"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={fechar.isPending}>
              Fechar caixa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Diferenca({ valor, className }: { valor: number; className?: string }) {
  if (valor === 0)
    return (
      <span className={cn('text-success flex items-center justify-end gap-1', className)}>
        <CircleCheck className="size-4" /> OK
      </span>
    )
  return (
    <span
      className={cn(
        'flex items-center justify-end gap-1 font-semibold whitespace-nowrap tabular-nums',
        valor < 0 ? 'text-danger' : 'text-warning',
        className,
      )}
    >
      {valor < 0 ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
      {valor > 0 ? '+' : '−'}
      {formatBRL(Math.abs(valor))}
    </span>
  )
}

export { FORMAS_CAIXA }
