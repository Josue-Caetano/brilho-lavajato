import {
  CalendarDays,
  ChartColumn,
  LayoutDashboard,
  Settings,
  Sparkles,
  SquareKanban,
  Users,
  Wallet,
} from 'lucide-react'

export interface NavItem {
  to: string
  titulo: string
  icon: React.ComponentType<{ className?: string }>
  apenasDono?: boolean
}

export const NAV: NavItem[] = [
  { to: '/', titulo: 'Painel do dia', icon: LayoutDashboard },
  { to: '/fila', titulo: 'Fila', icon: SquareKanban },
  { to: '/agenda', titulo: 'Agenda', icon: CalendarDays },
  { to: '/clientes', titulo: 'Clientes', icon: Users },
  { to: '/servicos', titulo: 'Serviços', icon: Sparkles },
  { to: '/caixa', titulo: 'Caixa', icon: Wallet },
  { to: '/relatorios', titulo: 'Relatórios', icon: ChartColumn, apenasDono: true },
  { to: '/configuracoes', titulo: 'Configurações', icon: Settings },
]

export function tituloDaRota(pathname: string): string {
  if (pathname.startsWith('/clientes/')) return 'Ficha do cliente'
  const item = NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  return item?.titulo ?? 'Brilho'
}
