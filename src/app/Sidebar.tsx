import { useQuery } from '@tanstack/react-query'
import { HardDrive, LogOut, TriangleAlert } from 'lucide-react'
import { NavLink } from 'react-router'
import { LogoMark } from '@/components/Logo'
import { Tooltip } from '@/components/ui/tooltip'
import { getDb } from '@/db'
import { contarAgendadosHoje } from '@/db/repositories/agendamentos'
import { contarFila } from '@/db/repositories/ordens'
import { useAgora } from '@/hooks/useAgora'
import { hojeIso, tempoRelativo } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { useSessao } from '@/stores/sessao'
import { NAV } from './nav'
import { qk, useConfig } from './queries'

export function Sidebar() {
  const usuario = useSessao((s) => s.usuario)
  const sair = useSessao((s) => s.sair)
  const { data: fila = 0 } = useQuery({
    queryKey: [...qk.ordens, 'contagem-fila'],
    queryFn: async () => contarFila(await getDb()),
  })
  const { data: agendados = 0 } = useQuery({
    queryKey: [...qk.ordens, 'agenda', 'contagem', hojeIso()],
    queryFn: async () => contarAgendadosHoje(await getDb(), hojeIso()),
  })
  const itens = NAV.filter((n) => !n.apenasDono || usuario?.papel === 'dono')

  return (
    <aside className="border-border bg-sidebar flex w-[224px] shrink-0 flex-col border-r 2xl:w-[244px]">
      <div className="flex h-[76px] items-center gap-2.5 px-5 2xl:px-6">
        <LogoMark />
        <span className="font-display text-xl font-bold tracking-tight">Brilho</span>
      </div>
      <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-1 px-3 pt-2">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex h-11 items-center gap-3 rounded-[var(--radius-btn)] px-3 text-[15px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary-tint text-primary-soft'
                  : 'text-muted hover:bg-surface-2 hover:text-text',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="bg-primary absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full"
                    aria-hidden
                  />
                )}
                <item.icon className="size-[19px] shrink-0" />
                <span className="flex-1">{item.titulo}</span>
                {item.to === '/agenda' && agendados > 0 && (
                  <span
                    className="bg-surface-2 text-text min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-bold tabular-nums"
                    aria-label={`${agendados} clientes agendados para hoje`}
                  >
                    {agendados}
                  </span>
                )}
                {item.to === '/fila' && fila > 0 && (
                  <span
                    className="bg-primary text-primary-foreground min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-bold tabular-nums"
                    aria-label={`${fila} carros na fila`}
                  >
                    {fila}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-border flex flex-col gap-2 border-t p-3">
        <BackupIndicador />
        <div className="flex items-center gap-2.5 rounded-[var(--radius-btn)] px-2 py-1.5">
          <span className="bg-surface-2 font-display flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
            {usuario?.nome.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{usuario?.nome}</span>
            <span className="text-muted block text-xs">
              {usuario?.papel === 'dono' ? 'Dono' : 'Funcionário'}
            </span>
          </span>
          <Tooltip content="Sair (trocar de usuário)">
            <button
              type="button"
              onClick={sair}
              aria-label="Sair"
              className="text-muted hover:bg-surface-2 hover:text-text inline-flex size-10 items-center justify-center rounded-[var(--radius-btn)] transition-colors"
            >
              <LogOut className="size-[18px]" />
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  )
}

function BackupIndicador() {
  const { data: cfg } = useConfig()
  const agora = useAgora(60_000)
  const ultimo = cfg?.backup.ultimo
  const semPasta = !cfg?.backup.pasta
  const atrasado = !ultimo || agora.getTime() - new Date(ultimo).getTime() > 1000 * 60 * 60 * 24
  const alerta = semPasta || atrasado
  return (
    <NavLink
      to="/configuracoes?aba=backup"
      className={cn(
        'flex items-center gap-2.5 rounded-[var(--radius-btn)] border px-3 py-2 text-xs transition-colors',
        alerta
          ? 'border-warning/30 bg-warning-tint text-warning hover:bg-warning/20'
          : 'border-border text-muted hover:bg-surface-2',
      )}
    >
      {alerta ? (
        <TriangleAlert className="size-4 shrink-0" />
      ) : (
        <HardDrive className="text-success size-4 shrink-0" />
      )}
      <span className="leading-tight">
        <span className="block font-semibold">{semPasta ? 'Backup não configurado' : 'Backup'}</span>
        <span className={alerta ? '' : 'text-muted'}>
          {semPasta
            ? 'Escolha uma pasta'
            : ultimo
              ? `Último ${tempoRelativo(ultimo, agora)}`
              : 'Nenhum backup ainda'}
        </span>
      </span>
    </NavLink>
  )
}
