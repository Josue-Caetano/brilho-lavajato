import { QueryClient, useQuery } from '@tanstack/react-query'
import { getDb } from '@/db'
import { carregarConfiguracoes } from '@/db/repositories/configuracoes'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
    mutations: { retry: 0 },
  },
})

/** Chaves de cache. Invalidar "ordens" atualiza fila, painel e relatórios de uma vez. */
export const qk = {
  config: ['config'] as const,
  usuarios: ['usuarios'] as const,
  servicos: ['servicos'] as const,
  ordens: ['ordens'] as const,
  clientes: ['clientes'] as const,
  caixa: ['caixa'] as const,
  demo: ['demo'] as const,
}

/** Depois de qualquer operação que mexe em ordens/pagamentos. */
export function invalidarMovimento() {
  for (const k of [qk.ordens, qk.clientes, qk.caixa]) void queryClient.invalidateQueries({ queryKey: k })
}

export function useConfig() {
  return useQuery({
    queryKey: qk.config,
    queryFn: async () => carregarConfiguracoes(await getDb()),
    staleTime: Infinity,
  })
}
