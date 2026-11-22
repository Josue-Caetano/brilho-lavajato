import { useQuery } from '@tanstack/react-query'
import { qk } from '@/app/queries'
import { getDb } from '@/db'
import { caixaAberto, resumoCaixa } from '@/db/repositories/caixa'

export function useCaixaAtual() {
  return useQuery({
    queryKey: [...qk.caixa, 'atual', ...qk.ordens],
    queryFn: async () => {
      const db = await getDb()
      const c = await caixaAberto(db)
      return c ? await resumoCaixa(db, c.id) : null
    },
  })
}
