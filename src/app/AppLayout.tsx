import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router'
import { Skeleton } from '@/components/ui/misc'
import { useUi } from '@/stores/ui'
import { useBackupAutomatico } from './backupAutomatico'
import { GlobalModals } from './GlobalModals'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  useAtalhosGlobais()
  useBackupAutomatico()
  return (
    <div className="flex h-full">
      <a
        href="#conteudo"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('conteudo')?.focus()
        }}
        className="bg-primary text-primary-foreground sr-only z-[100] rounded-[var(--radius-btn)] px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          id="conteudo"
          className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-6 2xl:px-8 2xl:pb-8"
          tabIndex={-1}
        >
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <GlobalModals />
    </div>
  )
}

/** F2 / Ctrl+N novo carro · F3 novo agendamento · Ctrl+K busca · F1 ajuda */
function useAtalhosGlobais() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUi.getState()
      const ctrl = e.ctrlKey || e.metaKey
      if (e.key === 'F2' || (ctrl && e.key.toLowerCase() === 'n')) {
        e.preventDefault()
        ui.abrirNovoCarro()
      } else if (e.key === 'F3') {
        e.preventDefault()
        ui.abrirAgendamento()
      } else if (ctrl && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ui.setBusca(!ui.busca)
      } else if (e.key === 'F1') {
        e.preventDefault()
        ui.setAjuda(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
