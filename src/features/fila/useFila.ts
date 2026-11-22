import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invalidarMovimento, qk } from '@/app/queries'
import { getDb } from '@/db'
import {
  cancelarOrdem,
  listarFila,
  moverOrdem,
  type OrdemFila,
  type StatusFila,
} from '@/db/repositories/ordens'
import { agoraIso } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { CAMPO_ETAPA } from '@/db/repositories/ordens'

export const filaKey = [...qk.ordens, 'fila'] as const

export function useFila() {
  return useQuery({ queryKey: filaKey, queryFn: async () => listarFila(await getDb()), staleTime: 5_000 })
}

/** Move o cartão com atualização otimista: a fila responde na hora, o banco grava em seguida. */
export function useMoverOrdem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, para }: { id: number; para: StatusFila }) => moverOrdem(await getDb(), id, para),
    onMutate: async ({ id, para }) => {
      await qc.cancelQueries({ queryKey: filaKey })
      const anterior = qc.getQueryData<OrdemFila[]>(filaKey)
      const agora = agoraIso()
      qc.setQueryData<OrdemFila[]>(filaKey, (lista) =>
        lista?.map((o) =>
          o.id === id
            ? { ...o, status: para, ...(para !== 'aguardando' ? { [CAMPO_ETAPA[para]]: agora } : {}) }
            : o,
        ),
      )
      return { anterior }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.anterior) qc.setQueryData(filaKey, ctx.anterior)
      toast.error(mensagemErro(e))
    },
    onSettled: () => invalidarMovimento(),
  })
}

export function useCancelarOrdem() {
  return useMutation({
    mutationFn: async (id: number) => cancelarOrdem(await getDb(), id),
    onSuccess: () => {
      toast.success('Ordem cancelada.')
      invalidarMovimento()
    },
    onError: (e) => toast.error(mensagemErro(e)),
  })
}
