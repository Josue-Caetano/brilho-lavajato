import { useEffect } from 'react'
import { toast } from 'sonner'
import { getDb, isTauri } from '@/db'
import { carregarConfiguracoes } from '@/db/repositories/configuracoes'
import { backupVencido } from '@/lib/backup'
import { fazerBackup } from '@/lib/backupIo'
import { mensagemErro } from '@/lib/erros'
import { queryClient, qk } from './queries'

async function backupSeConfigurado(forcar: boolean) {
  const cfg = await carregarConfiguracoes(await getDb())
  if (!cfg.backup.ativo || !cfg.backup.pasta) return false
  if (!forcar && !backupVencido(cfg.backup.ultimo, cfg.backup.intervaloHoras)) return false
  await fazerBackup()
  await queryClient.invalidateQueries({ queryKey: qk.config })
  return true
}

/** Confere a cada 10 minutos se o backup periódico venceu (somente no app instalado). */
export function useBackupAutomatico() {
  useEffect(() => {
    if (!isTauri()) return
    const verificar = () =>
      backupSeConfigurado(false)
        .then((feito) => feito && toast.success('Backup automático feito.', { duration: 2500 }))
        .catch((e) => toast.error(`Backup automático falhou: ${mensagemErro(e)}`))
    const primeiro = setTimeout(verificar, 60_000)
    const id = setInterval(verificar, 10 * 60_000)
    return () => {
      clearTimeout(primeiro)
      clearInterval(id)
    }
  }, [])
}

/** Ao fechar a janela, faz o backup (se configurado) antes de sair. */
export async function registrarBackupAoFechar() {
  if (!isTauri()) return
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const janela = getCurrentWindow()
  let fechando = false
  await janela.onCloseRequested(async (evento) => {
    if (fechando) return
    evento.preventDefault()
    fechando = true
    toast.loading('Fazendo backup antes de fechar…')
    try {
      await Promise.race([backupSeConfigurado(true), new Promise((r) => setTimeout(r, 20_000))])
    } catch {
      // nunca impedir o fechamento por causa do backup
    }
    await janela.destroy()
  })
}
