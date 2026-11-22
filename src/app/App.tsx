import { useQuery } from '@tanstack/react-query'
import { DatabaseZap } from 'lucide-react'
import { RouterProvider } from 'react-router'
import { LogoMark } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { getDb } from '@/db'
import { contarUsuarios } from '@/db/repositories/usuarios'
import { LoginPage } from '@/features/auth/LoginPage'
import { SetupWizard } from '@/features/auth/SetupWizard'
import { mensagemErro } from '@/lib/erros'
import { useSessao } from '@/stores/sessao'
import { qk, useConfig } from './queries'
import { router } from './router'

/** Porta de entrada: banco → assistente da primeira execução → login → app. */
export function App() {
  const usuario = useSessao((s) => s.usuario)
  const cfg = useConfig()
  const usuarios = useQuery({
    queryKey: [...qk.usuarios, 'contagem'],
    queryFn: async () => contarUsuarios(await getDb()),
  })

  if (cfg.isError || usuarios.isError) {
    return (
      <Centro>
        <DatabaseZap className="text-warning size-10" />
        <h1 className="font-display text-xl font-semibold">Não foi possível abrir o banco de dados</h1>
        <p className="text-muted max-w-md text-center">{mensagemErro(cfg.error ?? usuarios.error)}</p>
        <Button variant="primary" onClick={() => location.reload()}>
          Tentar de novo
        </Button>
      </Centro>
    )
  }
  if (cfg.isLoading || usuarios.isLoading || !cfg.data) {
    return (
      <Centro>
        <LogoMark className="size-12 animate-pulse" />
      </Centro>
    )
  }
  if (!cfg.data.setupConcluido || usuarios.data === 0) {
    return <SetupWizard onConcluido={() => void usuarios.refetch()} />
  }
  if (!usuario) return <LoginPage />
  return <RouterProvider router={router} />
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center gap-4 p-8">{children}</div>
}
