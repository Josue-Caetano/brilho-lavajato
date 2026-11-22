import { lazy } from 'react'
import { createHashRouter, Navigate } from 'react-router'
import { useEhDono } from '@/stores/sessao'
import { AppLayout } from './AppLayout'

const Painel = lazy(() => import('@/features/painel/PainelPage'))
const Fila = lazy(() => import('@/features/fila/FilaPage'))
const Agenda = lazy(() => import('@/features/agenda/AgendaPage'))
const Clientes = lazy(() => import('@/features/clientes/ClientesPage'))
const ClienteFicha = lazy(() => import('@/features/clientes/ClienteFichaPage'))
const Servicos = lazy(() => import('@/features/servicos/ServicosPage'))
const Caixa = lazy(() => import('@/features/caixa/CaixaPage'))
const Relatorios = lazy(() => import('@/features/relatorios/RelatoriosPage'))
const Configuracoes = lazy(() => import('@/features/configuracoes/ConfiguracoesPage'))

function SomenteDono({ children }: { children: React.ReactNode }) {
  return useEhDono() ? children : <Navigate to="/" replace />
}

// Hash router: funciona com o protocolo de arquivos do Tauri sem configuração de servidor.
export const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Painel /> },
      { path: 'fila', element: <Fila /> },
      { path: 'agenda', element: <Agenda /> },
      { path: 'clientes', element: <Clientes /> },
      { path: 'clientes/:id', element: <ClienteFicha /> },
      { path: 'servicos', element: <Servicos /> },
      { path: 'caixa', element: <Caixa /> },
      {
        path: 'relatorios',
        element: (
          <SomenteDono>
            <Relatorios />
          </SomenteDono>
        ),
      },
      { path: 'configuracoes', element: <Configuracoes /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
