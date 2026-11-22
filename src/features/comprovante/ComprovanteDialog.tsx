import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useConfig } from '@/app/queries'
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
import { Skeleton } from '@/components/ui/misc'
import { getDb } from '@/db'
import { obterComprovante } from '@/db/repositories/ordens'
import { useUi } from '@/stores/ui'
import { Comprovante } from './Comprovante'

/** Prévia do comprovante antes de imprimir. */
export function ComprovanteDialog() {
  const id = useUi((s) => s.comprovanteOrdemId)
  const fechar = () => useUi.getState().abrirComprovante(null)
  const { data: cfg } = useConfig()
  const { data } = useQuery({
    queryKey: ['comprovante', id],
    queryFn: async () => obterComprovante(await getDb(), id!),
    enabled: id !== null,
  })

  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && fechar()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Comprovante</DialogTitle>
          <DialogDescription>
            Prévia para impressora térmica de {cfg?.impressao.largura ?? '80'} mm.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="bg-surface-2 flex justify-center py-6">
          {data && cfg ? (
            <div className="shadow-pop">
              <Comprovante dados={data} cfg={cfg} />
            </div>
          ) : (
            <Skeleton className="h-96 w-[300px]" />
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={fechar}>
            Fechar
          </Button>
          <Button variant="primary" onClick={() => window.print()} disabled={!data} autoFocus>
            <Printer /> Imprimir
          </Button>
        </DialogFooter>
        {/* Cópia fora do modal só para a impressão (o CSS @media print mostra apenas .print-area) */}
        {data &&
          cfg &&
          createPortal(
            <div className="print-area hidden print:block">
              <Comprovante dados={data} cfg={cfg} />
            </div>,
            document.body,
          )}
      </DialogContent>
    </Dialog>
  )
}
