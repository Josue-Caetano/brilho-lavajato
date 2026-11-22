import { toast } from 'sonner'
import { queryClient, qk } from '@/app/queries'
import { getDb } from '@/db'
import { salvarConfig, type Configuracoes } from '@/db/repositories/configuracoes'
import { mensagemErro } from '@/lib/erros'

/** Salva uma chave de configuração, atualiza o cache e avisa. */
export async function gravarConfig<K extends keyof Configuracoes>(
  chave: K,
  valor: Configuracoes[K],
  ok = 'Configurações salvas.',
) {
  try {
    await salvarConfig(await getDb(), chave, valor)
    await queryClient.invalidateQueries({ queryKey: qk.config })
    if (ok) toast.success(ok)
    return true
  } catch (e) {
    toast.error(mensagemErro(e))
    return false
  }
}

export function Secao({
  titulo,
  descricao,
  children,
  acoes,
}: {
  titulo: string
  descricao?: string
  children: React.ReactNode
  acoes?: React.ReactNode
}) {
  return (
    <section className="border-border bg-surface flex flex-col gap-5 rounded-[var(--radius-card)] border p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{titulo}</h2>
          {descricao && <p className="text-muted mt-1 text-sm">{descricao}</p>}
        </div>
        {acoes}
      </header>
      {children}
    </section>
  )
}
