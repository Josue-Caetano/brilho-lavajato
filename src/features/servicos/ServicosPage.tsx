import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Lock, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { queryClient, qk } from '@/app/queries'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Tooltip } from '@/components/ui/tooltip'
import { getDb } from '@/db'
import {
  alternarServico,
  atualizarServico,
  criarServico,
  excluirServico,
  listarServicos,
  reordenarServicos,
  type Servico,
} from '@/db/repositories/servicos'
import { formatarDuracao } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { formatBRL } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useEhDono } from '@/stores/sessao'

const recarregar = () => queryClient.invalidateQueries({ queryKey: qk.servicos })

export default function ServicosPage() {
  const ehDono = useEhDono()
  const { data, isLoading } = useQuery({
    queryKey: [...qk.servicos, 'todos'],
    queryFn: async () => listarServicos(await getDb()),
  })
  const [form, setForm] = useState<{ aberto: boolean; servico?: Servico | null }>({ aberto: false })

  const acao = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn()
      await recarregar()
      if (ok) toast.success(ok)
    } catch (e) {
      toast.error(mensagemErro(e))
    }
  }

  const mover = (idx: number, dir: -1 | 1) => {
    if (!data) return
    const ids = data.map((s) => s.id)
    const alvo = idx + dir
    if (alvo < 0 || alvo >= ids.length) return
    ;[ids[idx], ids[alvo]] = [ids[alvo]!, ids[idx]!]
    void acao(async () => reordenarServicos(await getDb(), ids))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted">
          Preços por tipo de veículo. Van usa o preço de caminhonete. A ordem aqui é a mesma do “Novo carro”.
        </p>
        {ehDono ? (
          <Button variant="primary" onClick={() => setForm({ aberto: true, servico: null })}>
            <Plus /> Novo serviço
          </Button>
        ) : (
          <span className="text-muted flex items-center gap-2 text-sm">
            <Lock className="size-4" /> Só o dono altera preços
          </span>
        )}
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-border text-muted border-b text-left text-xs font-semibold tracking-wide uppercase">
              {ehDono && <th className="w-20 px-4 py-3" aria-label="Ordem" />}
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3 text-right">Carro</th>
              <th className="px-4 py-3 text-right">Caminhonete/Van</th>
              <th className="px-4 py-3 text-right">Moto</th>
              <th className="px-4 py-3 text-right">Duração</th>
              <th className="px-4 py-3 text-center">Ativo</th>
              {ehDono && <th className="w-28 px-4 py-3" aria-label="Ações" />}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="p-4">
                  <Skeleton className="h-40 w-full" />
                </td>
              </tr>
            )}
            {data?.map((s, idx) => (
              <tr key={s.id} className={cn('border-border border-b last:border-0', !s.ativo && 'text-muted')}>
                {ehDono && (
                  <td className="px-2 py-2">
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Subir ${s.nome}`}
                        disabled={idx === 0}
                        onClick={() => mover(idx, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Descer ${s.nome}`}
                        disabled={idx === data.length - 1}
                        onClick={() => mover(idx, 1)}
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="font-semibold">{s.nome}</span>
                  {s.descricao && <p className="text-muted text-sm">{s.descricao}</p>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{precoOuTraco(s.preco_carro)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{precoOuTraco(s.preco_caminhonete)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{precoOuTraco(s.preco_moto)}</td>
                <td className="text-muted px-4 py-3 text-right">{formatarDuracao(s.duracao_min)}</td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={!!s.ativo}
                    disabled={!ehDono}
                    aria-label={`${s.ativo ? 'Desativar' : 'Ativar'} ${s.nome}`}
                    onCheckedChange={(v) =>
                      acao(
                        async () => alternarServico(await getDb(), s.id, v),
                        v ? 'Serviço ativado.' : 'Serviço desativado.',
                      )
                    }
                  />
                </td>
                {ehDono && (
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Tooltip content="Editar">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${s.nome}`}
                          onClick={() => setForm({ aberto: true, servico: s })}
                        >
                          <Pencil />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Excluir">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Excluir ${s.nome}`}
                          onClick={async () => {
                            if (
                              !(await confirmar({
                                titulo: `Excluir “${s.nome}”?`,
                                confirmar: 'Excluir',
                                perigoso: true,
                              }))
                            )
                              return
                            void acao(async () => {
                              if (!(await excluirServico(await getDb(), s.id)))
                                throw new Error(
                                  'Este serviço já foi usado em ordens. Desative-o em vez de excluir.',
                                )
                            }, 'Serviço excluído.')
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && (
          <EmptyState
            icon={Sparkles}
            titulo="Nenhum serviço cadastrado"
            descricao="Cadastre os serviços para escolher no “Novo carro”."
            acao={
              ehDono && (
                <Button variant="primary" onClick={() => setForm({ aberto: true, servico: null })}>
                  <Plus /> Novo serviço
                </Button>
              )
            }
          />
        )}
      </Card>
      <ServicoFormDialog {...form} onFechar={() => setForm({ aberto: false })} />
    </div>
  )
}

const precoOuTraco = (v: number) => (v > 0 ? formatBRL(v) : <span className="text-muted">—</span>)

const schema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome'),
  descricao: z.string(),
  preco_carro: z.number().int().min(0),
  preco_caminhonete: z.number().int().min(0),
  preco_moto: z.number().int().min(0),
  duracao_min: z.number({ error: 'Informe a duração' }).int().min(5, 'Mínimo de 5 min').max(1440),
})
type Form = z.infer<typeof schema>

function ServicoFormDialog({
  aberto,
  servico,
  onFechar,
}: {
  aberto: boolean
  servico?: Servico | null
  onFechar: () => void
}) {
  const form = useForm<Form>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (aberto)
      form.reset({
        nome: servico?.nome ?? '',
        descricao: servico?.descricao ?? '',
        preco_carro: servico?.preco_carro ?? 0,
        preco_caminhonete: servico?.preco_caminhonete ?? 0,
        preco_moto: servico?.preco_moto ?? 0,
        duracao_min: servico?.duracao_min ?? 30,
      })
  }, [aberto, servico, form])

  const salvar = form.handleSubmit(async (d) => {
    try {
      const db = await getDb()
      if (servico) await atualizarServico(db, servico.id, { ...d, ativo: !!servico.ativo })
      else await criarServico(db, d)
      await recarregar()
      toast.success(servico ? 'Serviço atualizado.' : 'Serviço criado.')
      onFechar()
    } catch (e) {
      toast.error(mensagemErro(e))
    }
  })
  const err = form.formState.errors
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent size="md">
        <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{servico ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
            <DialogDescription>
              Deixe o preço em zero quando o serviço não existir para aquele tipo.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field label="Nome" htmlFor="sf-nome" error={err.nome?.message}>
              <Input id="sf-nome" autoFocus aria-invalid={!!err.nome} {...form.register('nome')} />
            </Field>
            <Field label="Descrição (opcional)" htmlFor="sf-desc">
              <Input id="sf-desc" {...form.register('descricao')} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ['preco_carro', 'Carro'],
                  ['preco_caminhonete', 'Caminhonete/Van'],
                  ['preco_moto', 'Moto'],
                ] as const
              ).map(([campo, rotulo]) => (
                <Field key={campo} label={rotulo} htmlFor={`sf-${campo}`}>
                  <Controller
                    control={form.control}
                    name={campo}
                    render={({ field }) => (
                      <MoneyInput id={`sf-${campo}`} value={field.value} onValueChange={field.onChange} />
                    )}
                  />
                </Field>
              ))}
            </div>
            <Field
              label="Duração prevista (minutos)"
              htmlFor="sf-dur"
              error={err.duracao_min?.message}
              hint="Usada para avisar quando um carro passa do tempo na fila."
            >
              <Input
                id="sf-dur"
                type="number"
                min={5}
                step={5}
                className="w-40"
                aria-invalid={!!err.duracao_min}
                {...form.register('duracao_min', { valueAsNumber: true })}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={form.formState.isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
