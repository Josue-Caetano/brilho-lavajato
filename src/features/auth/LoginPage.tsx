import { useQuery } from '@tanstack/react-query'
import { Lock, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { qk, useConfig } from '@/app/queries'
import { Logo } from '@/components/Logo'
import { Skeleton } from '@/components/ui/misc'
import { getDb } from '@/db'
import { autenticar, listarUsuarios, type Usuario } from '@/db/repositories/usuarios'
import { preferencias, salvarPreferencias } from '@/lib/prefs'
import { cn } from '@/lib/utils'
import { useSessao } from '@/stores/sessao'
import { PinPad } from './PinPad'

export function LoginPage() {
  const { data: usuarios, isLoading } = useQuery({
    queryKey: [...qk.usuarios, 'ativos'],
    queryFn: async () => listarUsuarios(await getDb(), true),
  })
  const { data: cfg } = useConfig()
  const entrar = useSessao((s) => s.entrar)
  const [selecionadoId, setSelecionadoId] = useState<number | null>(preferencias().ultimoUsuarioId)
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState(false)
  const [conferindo, setConferindo] = useState(false)

  const selecionado: Usuario | undefined =
    usuarios?.find((u) => u.id === selecionadoId) ?? (usuarios?.length === 1 ? usuarios[0] : undefined)

  const tentar = async (valor: string) => {
    if (!selecionado) return
    setConferindo(true)
    const u = await autenticar(await getDb(), selecionado.id, valor)
    setConferindo(false)
    if (u) {
      void salvarPreferencias({ ultimoUsuarioId: u.id })
      entrar(u)
    } else {
      setErro(true)
      setTimeout(() => {
        setErro(false)
        setPin('')
      }, 450)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="grid w-full max-w-4xl grid-cols-1 items-center gap-12 md:grid-cols-[1fr_auto]">
        <section className="animate-slide-up">
          <Logo className="mb-10" />
          <h1 className="font-display text-3xl font-bold tracking-tight">Quem está no balcão?</h1>
          <p className="text-muted mt-2">{cfg?.empresa.nome ?? 'Escolha seu usuário e digite o PIN.'}</p>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3" role="radiogroup" aria-label="Usuários">
            {isLoading &&
              Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-[var(--radius-card)]" />
              ))}
            {usuarios?.map((u) => {
              const ativo = selecionado?.id === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => {
                    setSelecionadoId(u.id)
                    setPin('')
                  }}
                  className={cn(
                    'flex min-h-24 flex-col items-start justify-between gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-all duration-200',
                    ativo
                      ? 'border-primary bg-primary-tint'
                      : 'border-border bg-surface hover:border-border-strong hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'font-display flex size-9 items-center justify-center rounded-full text-sm font-bold',
                      ativo ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-text',
                    )}
                  >
                    {u.nome.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <span className="block font-semibold">{u.nome}</span>
                    <span className="text-muted flex items-center gap-1 text-[13px]">
                      {u.papel === 'dono' ? (
                        <ShieldCheck className="size-3.5" />
                      ) : (
                        <UserRound className="size-3.5" />
                      )}
                      {u.papel === 'dono' ? 'Dono' : 'Funcionário'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section
          className="animate-slide-up border-border bg-surface rounded-[var(--radius-card)] border p-8"
          aria-label="Digite o PIN"
        >
          <div className="mb-7 flex flex-col items-center gap-1 text-center">
            <Lock className="text-muted mb-2 size-5" />
            <p className="font-display text-lg font-semibold">
              {selecionado ? `Olá, ${selecionado.nome.split(' ')[0]}` : 'Selecione um usuário'}
            </p>
            <p className="text-muted text-sm">
              {erro ? 'PIN incorreto. Tente de novo.' : 'Digite seu PIN de 4 dígitos'}
            </p>
          </div>
          <PinPad
            value={pin}
            onChange={setPin}
            onComplete={tentar}
            erro={erro}
            disabled={!selecionado || conferindo}
          />
        </section>
      </div>
    </div>
  )
}
