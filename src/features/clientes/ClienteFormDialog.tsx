import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { invalidarMovimento } from '@/app/queries'
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
import { getDb } from '@/db'
import { atualizarCliente, criarCliente, type Cliente } from '@/db/repositories/clientes'
import { mensagemErro } from '@/lib/erros'
import { formatarTelefone, telefoneValido } from '@/lib/telefone'

const schema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome'),
  telefone: z.string().refine((t) => !t || telefoneValido(t), 'Telefone incompleto'),
  aniversario: z
    .string()
    .refine((t) => !t || /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])$/.test(t), 'Use dd/mm'),
  observacoes: z.string(),
})
type Form = z.infer<typeof schema>

/** "03-14" ⇄ "14/03" */
const anivParaTela = (a: string | null) => (a ? `${a.slice(3, 5)}/${a.slice(0, 2)}` : '')
const anivParaBanco = (a: string) => (a ? `${a.slice(3, 5)}-${a.slice(0, 2)}` : '')

export function ClienteFormDialog({
  aberto,
  onFechar,
  cliente,
  onSalvo,
}: {
  aberto: boolean
  onFechar: () => void
  cliente?: Cliente | null
  onSalvo?: (id: number) => void
}) {
  const form = useForm<Form>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (aberto)
      form.reset({
        nome: cliente?.nome ?? '',
        telefone: formatarTelefone(cliente?.telefone),
        aniversario: anivParaTela(cliente?.aniversario ?? null),
        observacoes: cliente?.observacoes ?? '',
      })
  }, [aberto, cliente, form])

  const salvar = form.handleSubmit(async (d) => {
    try {
      const db = await getDb()
      const dados = { ...d, aniversario: anivParaBanco(d.aniversario) }
      let id = cliente?.id
      if (id) await atualizarCliente(db, id, dados)
      else id = await criarCliente(db, dados)
      invalidarMovimento()
      toast.success(cliente ? 'Cliente atualizado.' : 'Cliente cadastrado.')
      onSalvo?.(id)
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
            <DialogTitle>{cliente ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
            <DialogDescription>O telefone é usado para avisar pelo WhatsApp.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field label="Nome" htmlFor="cf-nome" error={err.nome?.message}>
              <Input id="cf-nome" autoFocus {...form.register('nome')} aria-invalid={!!err.nome} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="WhatsApp" htmlFor="cf-tel" error={err.telefone?.message}>
                <Input
                  id="cf-tel"
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  aria-invalid={!!err.telefone}
                  {...form.register('telefone', {
                    onChange: (e) => form.setValue('telefone', formatarTelefone(e.target.value)),
                  })}
                />
              </Field>
              <Field label="Aniversário (opcional)" htmlFor="cf-aniv" error={err.aniversario?.message}>
                <Input
                  id="cf-aniv"
                  placeholder="dd/mm"
                  maxLength={5}
                  aria-invalid={!!err.aniversario}
                  {...form.register('aniversario', {
                    onChange: (e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 4)
                      form.setValue('aniversario', d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
                    },
                  })}
                />
              </Field>
            </div>
            <Field
              label="Observações"
              htmlFor="cf-obs"
              hint="Aparecem na fila e no novo carro. Ex.: não usar pretinho no pneu."
            >
              <Textarea id="cf-obs" rows={3} {...form.register('observacoes')} />
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
