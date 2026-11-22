import { CircleHelp, Plus, Search } from 'lucide-react'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { dataPorExtenso } from '@/lib/datas'
import { useUi } from '@/stores/ui'
import { tituloDaRota } from './nav'

export function Header() {
  const { pathname } = useLocation()
  const abrirNovoCarro = useUi((s) => s.abrirNovoCarro)
  const setBusca = useUi((s) => s.setBusca)
  const setAjuda = useUi((s) => s.setAjuda)
  const data = dataPorExtenso()
  return (
    <header className="flex h-[92px] shrink-0 items-center justify-between gap-6 px-6 2xl:px-8">
      <div className="min-w-0">
        <p className="text-muted text-sm first-letter:uppercase">{data}</p>
        <h1 className="font-display truncate text-[28px] leading-tight font-bold tracking-tight">
          {tituloDaRota(pathname)}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setBusca(true)}
          className="border-border-strong bg-surface text-muted hover:border-primary/50 flex h-11 w-[300px] items-center gap-3 rounded-[var(--radius-btn)] border px-3.5 text-[15px] transition-colors max-xl:w-11 max-xl:justify-center max-xl:px-0"
          aria-label="Buscar (Ctrl+K)"
        >
          <Search className="size-[18px] shrink-0" />
          <span className="flex-1 text-left max-xl:hidden">Buscar placa, cliente…</span>
          <span className="flex gap-1 max-xl:hidden">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <Tooltip content="Atalhos de teclado (F1)">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ajuda e atalhos de teclado (F1)"
            onClick={() => setAjuda(true)}
          >
            <CircleHelp />
          </Button>
        </Tooltip>
        <Button variant="primary" size="md" onClick={abrirNovoCarro} className="px-5">
          <Plus /> Novo carro
          <Kbd className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground ml-1">
            F2
          </Kbd>
        </Button>
      </div>
    </header>
  )
}
