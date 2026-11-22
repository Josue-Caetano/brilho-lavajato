import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { create } from 'zustand'
import { Button } from './button'

interface ConfirmOptions {
  titulo: string
  descricao?: React.ReactNode
  confirmar?: string
  cancelar?: string
  perigoso?: boolean
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve?: (ok: boolean) => void
}

const useConfirmStore = create<ConfirmState>(() => ({ open: false, titulo: '' }))

/** Pergunta de confirmação com promessa: `if (await confirmar({...})) ...` */
export function confirmar(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.setState({ ...opts, open: true, resolve }))
}

export function ConfirmHost() {
  const s = useConfirmStore()
  const fechar = (ok: boolean) => {
    s.resolve?.(ok)
    useConfirmStore.setState({ open: false, resolve: undefined })
  }
  return (
    <AlertDialog.Root open={s.open} onOpenChange={(o) => !o && fechar(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="bg-overlay data-[state=open]:animate-fade-in fixed inset-0 z-[60]" />
        <AlertDialog.Content className="border-border bg-surface shadow-pop data-[state=open]:animate-pop-in fixed top-1/2 left-1/2 z-[60] w-[calc(100vw-48px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border p-6">
          <AlertDialog.Title className="font-display text-lg font-semibold">{s.titulo}</AlertDialog.Title>
          {s.descricao && (
            <AlertDialog.Description asChild>
              <div className="text-muted mt-2 text-[15px] leading-relaxed">{s.descricao}</div>
            </AlertDialog.Description>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">{s.cancelar ?? 'Cancelar'}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={s.perigoso ? 'danger' : 'primary'} onClick={() => fechar(true)}>
                {s.confirmar ?? 'Confirmar'}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
