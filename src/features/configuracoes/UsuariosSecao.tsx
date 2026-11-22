import { useQuery } from '@tanstack/react-query'
import { Pencil, ShieldCheck, UserPlus, UserRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { queryClient, qk } from '@/app/queries'
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
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Badge, Segmented } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { getDb } from '@/db'
import {
  atualizarUsuario,
  contarDonosAtivos,
  criarUsuario,
  listarUsuarios,
  type Papel,
  type Usuario,
} from '@/db/repositories/usuarios'
import { mensagemErro } from '@/lib/erros'
import { pinValido } from '@/lib/pin'
import { useSessao } from '@/stores/sessao'
import { Secao } from './comum'

export function UsuariosSecao() {
  const eu = useSessao((s) => s.usuario)
  const { data = [] } = useQuery({
    queryKey: [...qk.usuarios, 'todos'],
    queryFn: async () => listarUsuarios(await getDb()),
  })
  const [form, setForm] = useState<{ aberto: boolean; usuario?: Usuario | null }>({ aberto: false })
  return (
    <Secao
      titulo="Usuários e PINs"
      descricao="O dono vê tudo. Funcionários operam fila, clientes e caixa, sem relatórios nem valores do painel."
      acoes={
        <Button variant="primary" onClick={() => setForm({ aberto: true, usuario: null })}>
          <UserPlus /> Novo usuário
        </Button>
      }
    >
      <ul className="divide-border border-border flex flex-col divide-y rounded-[14px] border">
        {data.map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-4 py-3">
            <span className="bg-surface-2 font-display flex size-10 items-center justify-center rounded-full font-bold">
              {u.nome.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {u.nome} {u.id === eu?.id && <span className="text-muted text-sm font-normal">(você)</span>}
              </span>
              <span className="text-muted flex items-center gap-1 text-sm">
                {u.papel === 'dono' ? (
                  <ShieldCheck className="size-3.5" />
                ) : (
                  <UserRound className="size-3.5" />
                )}
                {u.papel === 'dono' ? 'Dono' : 'Funcionário'}
              </span>
            </span>
            {!u.ativo && <Badge tone="danger">Inativo</Badge>}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Editar ${u.nome}`}
              onClick={() => setForm({ aberto: true, usuario: u })}
            >
              <Pencil />
            </Button>
          </li>
        ))}
      </ul>
      {form.aberto && <UsuarioDialog usuario={form.usuario} onFechar={() => setForm({ aberto: false })} />}
    </Secao>
  )
}

function UsuarioDialog({ usuario, onFechar }: { usuario?: Usuario | null; onFechar: () => void }) {
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [papel, setPapel] = useState<Papel>(usuario?.papel ?? 'funcionario')
  const [ativo, setAtivo] = useState(usuario ? !!usuario.ativo : true)
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState<string>()
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nome.trim().length < 2) return setErro('Informe o nome.')
    if ((!usuario || pin) && !pinValido(pin)) return setErro('O PIN precisa ter 4 números.')
    setSalvando(true)
    try {
      const db = await getDb()
      if (usuario) {
        const perdeDono = usuario.papel === 'dono' && usuario.ativo && (papel !== 'dono' || !ativo)
        if (perdeDono && (await contarDonosAtivos(db)) <= 1)
          throw new Error('É preciso ter pelo menos um dono ativo.')
        await atualizarUsuario(db, usuario.id, { nome, papel, ativo, pin: pin || undefined })
      } else {
        await criarUsuario(db, nome, pin, papel)
      }
      await queryClient.invalidateQueries({ queryKey: qk.usuarios })
      toast.success(usuario ? 'Usuário atualizado.' : 'Usuário criado.')
      onFechar()
    } catch (err) {
      toast.error(mensagemErro(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent size="sm">
        <form onSubmit={salvar} className="flex flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{usuario ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
            <DialogDescription>
              {usuario ? 'Deixe o PIN em branco para manter o atual.' : 'O PIN tem 4 números.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field label="Nome" htmlFor="us-nome">
              <Input id="us-nome" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Papel</span>
              <Segmented
                aria-label="Papel"
                value={papel}
                onChange={setPapel}
                options={[
                  { value: 'funcionario', label: 'Funcionário' },
                  { value: 'dono', label: 'Dono' },
                ]}
              />
            </div>
            <Field label={usuario ? 'Novo PIN (opcional)' : 'PIN'} htmlFor="us-pin" error={erro}>
              <Input
                id="us-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="new-password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''))
                  setErro(undefined)
                }}
                className="w-32 tracking-[0.5em]"
              />
            </Field>
            {usuario && (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={ativo} onCheckedChange={setAtivo} aria-label="Usuário ativo" />
                Ativo (aparece na tela de entrada)
              </label>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={salvando}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
