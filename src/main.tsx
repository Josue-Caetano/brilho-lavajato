import { QueryClientProvider } from '@tanstack/react-query'
import { setDefaultOptions } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { App } from '@/app/App'
import { registrarBackupAoFechar } from '@/app/backupAutomatico'
import { queryClient } from '@/app/queries'
import { ConfirmHost } from '@/components/ui/confirm'
import { TooltipProvider } from '@/components/ui/tooltip'
import { carregarPreferencias } from '@/lib/prefs'
import { useUi } from '@/stores/ui'
import '@/styles/index.css'

// Português do Brasil e semana começando no domingo em todo o app
setDefaultOptions({ locale: ptBR, weekStartsOn: 0 })

function ThemedToaster() {
  const tema = useUi((s) => s.prefs.tema)
  return (
    <Toaster position="bottom-right" theme={tema === 'claro' ? 'light' : 'dark'} richColors closeButton />
  )
}

void registrarBackupAoFechar()

void carregarPreferencias().then((prefs) => {
  useUi.setState({ prefs })
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={400}>
          <App />
          <ConfirmHost />
          <ThemedToaster />
        </TooltipProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
})
