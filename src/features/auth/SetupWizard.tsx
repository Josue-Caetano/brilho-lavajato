import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Building2, Check, Sparkles, UserRound, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Logo } from '@/components/Logo'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getDb } from '@/db'
import { CONFIG_PADRAO, stmtSalvarConfig } from '@/db/repositories/configuracoes'
import { SERVICOS_PADRAO, stmtCriarServico, type ServicoInput } from '@/db/repositories/servicos'
import { listarUsuarios, stmtCriarUsuario } from '@/db/repositories/usuarios'
import { carregarDemo } from '@/db/seed'
import { mensagemErro } from '@/lib/erros'
import { salvarPreferencias } from '@/lib/prefs'
import { formatarTelefone } from '@/lib/telefone'
import { cn } from '@/lib/utils'
import { useSessao } from '@/stores/sessao'

const donoSchema = z
  .object({
    nome: z.string().trim().min(2, 'Informe seu nome'),
    pin: z.string().regex(/^\d{4}$/, 'O PIN tem 4 números'),
    confirmar: z.string(),
  })
  .refine((d) => d.pin === d.confirmar, { message: 'Os PINs não conferem', path: ['confirmar'] })

const empresaSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do lava-jato'),
  telefone: z.string().optional(),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
})

type Dono = z.infer<typeof donoSchema>
type Empresa = z.infer<typeof empresaSchema>

const PASSOS = [
  { titulo: 'Você', icon: UserRound },
  { titulo: 'Empresa', icon: Building2 },
  { titulo: 'Serviços', icon: Sparkles },
  { titulo: 'Pronto', icon: Wand2 },
]

export function SetupWizard({ onConcluido }: { onConcluido: () => void }) {
  const [passo, setPasso] = useState(0)
  const [dono, setDono] = useState<Dono | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [servicos, setServicos] = useState<(ServicoInput & { incluir: boolean })[]>(
    SERVICOS_PADRAO.map((s) => ({ ...s, incluir: true })),
  )
  const [demo, setDemo] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const entrar = useSessao((s) => s.entrar)
  const qc = useQueryClient()

  const donoForm = useForm<Dono>({ resolver: zodResolver(donoSchema), defaultValues: dono ?? undefined })
  const empresaForm = useForm<Empresa>({
    resolver: zodResolver(empresaSchema),
    defaultValues: empresa ?? { nome: '' },
  })

  const concluir = async () => {
    if (!dono || !empresa) return
    setSalvando(true)
    try {
      const db = await getDb()
      await db.transaction([
        await stmtCriarUsuario(dono.nome, dono.pin, 'dono'),
        stmtSalvarConfig('empresa', {
          ...CONFIG_PADRAO.empresa,
          nome: empresa.nome.trim(),
          telefone: empresa.telefone ?? '',
          cnpj: empresa.cnpj ?? '',
          endereco: empresa.endereco ?? '',
        }),
        ...servicos.filter((s) => s.incluir).map((s, i) => stmtCriarServico(s, i + 1)),
        stmtSalvarConfig('setupConcluido', true),
      ])
      if (demo) await carregarDemo(db)
      const [u] = await listarUsuarios(db)
      await qc.invalidateQueries()
      toast.success('Tudo pronto! Bem-vindo ao Brilho.')
      if (u) {
        void salvarPreferencias({ ultimoUsuarioId: u.id })
        entrar(u)
      }
      onConcluido()
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="w-full max-w-3xl">
        <Logo className="mb-8" />
        <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Etapas">
          {PASSOS.map((p, i) => (
            <li
              key={p.titulo}
              aria-current={i === passo ? 'step' : undefined}
              className="flex flex-col gap-2"
            >
              <span
                className={cn(
                  'h-1.5 rounded-full transition-colors duration-300',
                  i <= passo ? 'bg-primary' : 'bg-surface-2',
                )}
              />
              <span
                className={cn('flex items-center gap-1.5 text-sm', i === passo ? 'text-text' : 'text-muted')}
              >
                <p.icon className="size-4" /> {p.titulo}
              </span>
            </li>
          ))}
        </ol>

        <div
          key={passo}
          className="animate-slide-up border-border bg-surface rounded-[var(--radius-card)] border p-8"
        >
          {passo === 0 && (
            <form
              onSubmit={donoForm.handleSubmit((d) => {
                setDono(d)
                setPasso(1)
              })}
              className="flex flex-col gap-5"
            >
              <header>
                <h1 className="font-display text-2xl font-bold">Bem-vindo ao Brilho</h1>
                <p className="text-muted mt-1">
                  Vamos deixar tudo pronto em 1 minuto. Primeiro, crie o acesso do dono — ele vê tudo,
                  inclusive o faturamento.
                </p>
              </header>
              <Field label="Seu nome" htmlFor="dono-nome" error={donoForm.formState.errors.nome?.message}>
                <Input id="dono-nome" autoFocus placeholder="Ex.: João" {...donoForm.register('nome')} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="PIN (4 números)"
                  htmlFor="dono-pin"
                  error={donoForm.formState.errors.pin?.message}
                >
                  <Input
                    id="dono-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="new-password"
                    {...donoForm.register('pin')}
                  />
                </Field>
                <Field
                  label="Confirme o PIN"
                  htmlFor="dono-pin2"
                  error={donoForm.formState.errors.confirmar?.message}
                >
                  <Input
                    id="dono-pin2"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="new-password"
                    {...donoForm.register('confirmar')}
                  />
                </Field>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" size="lg">
                  Continuar <ArrowRight />
                </Button>
              </div>
            </form>
          )}

          {passo === 1 && (
            <form
              onSubmit={empresaForm.handleSubmit((d) => {
                setEmpresa(d)
                setPasso(2)
              })}
              className="flex flex-col gap-5"
            >
              <header>
                <h1 className="font-display text-2xl font-bold">Dados do lava-jato</h1>
                <p className="text-muted mt-1">Aparecem no comprovante e nas mensagens do WhatsApp.</p>
              </header>
              <Field
                label="Nome do lava-jato"
                htmlFor="emp-nome"
                error={empresaForm.formState.errors.nome?.message}
              >
                <Input
                  id="emp-nome"
                  autoFocus
                  placeholder="Ex.: Brilho Lava-Jato"
                  {...empresaForm.register('nome')}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Telefone" htmlFor="emp-tel">
                  <Input
                    id="emp-tel"
                    inputMode="tel"
                    placeholder="(11) 99999-9999"
                    {...empresaForm.register('telefone', {
                      onChange: (e) => empresaForm.setValue('telefone', formatarTelefone(e.target.value)),
                    })}
                  />
                </Field>
                <Field label="CNPJ (opcional)" htmlFor="emp-cnpj">
                  <Input id="emp-cnpj" placeholder="00.000.000/0001-00" {...empresaForm.register('cnpj')} />
                </Field>
              </div>
              <Field label="Endereço (opcional)" htmlFor="emp-end">
                <Input
                  id="emp-end"
                  placeholder="Rua, número — bairro"
                  {...empresaForm.register('endereco')}
                />
              </Field>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setPasso(0)}>
                  <ArrowLeft /> Voltar
                </Button>
                <Button type="submit" variant="primary" size="lg">
                  Continuar <ArrowRight />
                </Button>
              </div>
            </form>
          )}

          {passo === 2 && (
            <div className="flex flex-col gap-5">
              <header>
                <h1 className="font-display text-2xl font-bold">Serviços e preços</h1>
                <p className="text-muted mt-1">Ajuste os preços agora ou depois, na tela Serviços.</p>
              </header>
              <div className="border-border overflow-hidden rounded-[14px] border">
                <div className="border-border bg-surface-2 text-muted grid grid-cols-[auto_1fr_120px_120px_120px] items-center gap-3 border-b px-4 py-2.5 text-xs font-semibold tracking-wide uppercase">
                  <span className="w-12" />
                  <span>Serviço</span>
                  <span className="text-right">Carro</span>
                  <span className="text-right">Caminhonete</span>
                  <span className="text-right">Moto</span>
                </div>
                {servicos.map((s, i) => {
                  const set = (patch: Partial<ServicoInput & { incluir: boolean }>) =>
                    setServicos((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)))
                  return (
                    <div
                      key={s.nome}
                      className={cn(
                        'border-border grid grid-cols-[auto_1fr_120px_120px_120px] items-center gap-3 border-b px-4 py-2 last:border-0',
                        !s.incluir && 'opacity-50',
                      )}
                    >
                      <Switch
                        checked={s.incluir}
                        onCheckedChange={(v) => set({ incluir: v })}
                        aria-label={`Incluir ${s.nome}`}
                      />
                      <span className="font-medium">{s.nome}</span>
                      <MoneyInput
                        aria-label={`${s.nome} — carro`}
                        value={s.preco_carro}
                        onValueChange={(v) => set({ preco_carro: v })}
                      />
                      <MoneyInput
                        aria-label={`${s.nome} — caminhonete`}
                        value={s.preco_caminhonete}
                        onValueChange={(v) => set({ preco_caminhonete: v })}
                      />
                      <MoneyInput
                        aria-label={`${s.nome} — moto`}
                        value={s.preco_moto}
                        onValueChange={(v) => set({ preco_moto: v })}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setPasso(1)}>
                  <ArrowLeft /> Voltar
                </Button>
                <Button variant="primary" size="lg" onClick={() => setPasso(3)}>
                  Continuar <ArrowRight />
                </Button>
              </div>
            </div>
          )}

          {passo === 3 && (
            <div className="flex flex-col gap-6">
              <header>
                <h1 className="font-display text-2xl font-bold">Tudo certo, {dono?.nome.split(' ')[0]}!</h1>
                <p className="text-muted mt-1">
                  {empresa?.nome} com {servicos.filter((s) => s.incluir).length} serviços cadastrados.
                </p>
              </header>
              <label className="border-border bg-surface-2 flex cursor-pointer items-start gap-4 rounded-[14px] border p-4">
                <Switch
                  checked={demo}
                  onCheckedChange={setDemo}
                  aria-label="Carregar dados de demonstração"
                />
                <span>
                  <span className="block font-semibold">Carregar dados de demonstração</span>
                  <span className="text-muted text-sm">
                    15 clientes fictícios e 30 dias de histórico para você explorar o sistema. Dá para apagar
                    tudo com um clique em Configurações.
                  </span>
                </span>
              </label>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setPasso(2)} disabled={salvando}>
                  <ArrowLeft /> Voltar
                </Button>
                <Button variant="primary" size="lg" onClick={concluir} loading={salvando}>
                  <Check /> Começar a usar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
