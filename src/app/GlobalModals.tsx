import { AgendamentoDialog } from '@/features/agenda/AgendamentoDialog'
import { AjudaDialog } from '@/features/ajuda/AjudaDialog'
import { BuscaGlobal } from '@/features/busca/BuscaGlobal'
import { ComprovanteDialog } from '@/features/comprovante/ComprovanteDialog'
import { NovoCarroDialog } from '@/features/novo-carro/NovoCarroDialog'
import { PagamentoDialog } from '@/features/pagamento/PagamentoDialog'

/** Modais acessíveis de qualquer tela (novo carro, busca, ajuda, pagamento). */
export function GlobalModals() {
  return (
    <>
      <NovoCarroDialog />
      <AgendamentoDialog />
      <PagamentoDialog />
      <ComprovanteDialog />
      <BuscaGlobal />
      <AjudaDialog />
    </>
  )
}
