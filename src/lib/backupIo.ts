import { invoke } from '@tauri-apps/api/core'
import { getDb, isTauri } from '@/db'
import { carregarConfiguracoes, salvarConfig } from '@/db/repositories/configuracoes'
import { agoraIso } from './datas'
import { backupsParaApagar, juntarCaminho, nomeBackup } from './backup'
import { salvarArquivo } from './arquivos'

/**
 * Faz o backup na pasta configurada (cópia consistente via VACUUM INTO), apaga os antigos
 * além do limite e registra a data. No navegador, baixa uma cópia do banco.
 */
export async function fazerBackup(): Promise<string | null> {
  const db = await getDb()
  const cfg = await carregarConfiguracoes(db)
  const nome = nomeBackup()
  let destino: string | null
  if (isTauri()) {
    if (!cfg.backup.pasta) throw new Error('Escolha a pasta de backup em Configurações.')
    destino = juntarCaminho(cfg.backup.pasta, nome)
    await invoke('db_backup', { destino })
    const { readDir, remove } = await import('@tauri-apps/plugin-fs')
    const arquivos = (await readDir(cfg.backup.pasta)).filter((e) => e.isFile).map((e) => e.name)
    for (const antigo of backupsParaApagar(arquivos, cfg.backup.manter)) {
      await remove(juntarCaminho(cfg.backup.pasta, antigo)).catch(() => undefined)
    }
  } else {
    const { exportarBancoNavegador } = await import('@/db')
    destino = await salvarArquivo(nome, exportarBancoNavegador(), {
      name: 'Backup do Brilho',
      extensions: ['db'],
    })
    if (!destino) return null
  }
  await salvarConfig(db, 'backup', { ...cfg.backup, ultimo: agoraIso() })
  return destino
}

/** Escolhe a pasta de backup (pen drive, Google Drive, OneDrive…). */
export async function escolherPastaBackup(): Promise<string | null> {
  if (!isTauri()) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const pasta = await open({ directory: true, multiple: false, title: 'Escolha a pasta de backup' })
  return typeof pasta === 'string' ? pasta : null
}

/** Restaura um backup escolhido. No app o Brilho reinicia sozinho em seguida. */
export async function restaurarBackup(): Promise<boolean> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const origem = await open({
      multiple: false,
      filters: [{ name: 'Backup do Brilho', extensions: ['db'] }],
    })
    if (typeof origem !== 'string') return false
    await invoke('db_restore', { origem })
    return true
  }
  const { abrirArquivo } = await import('./arquivos')
  const arq = await abrirArquivo({ name: 'Backup do Brilho', extensions: ['db'] })
  if (!arq) return false
  const { importarBancoNavegador } = await import('@/db')
  importarBancoNavegador(arq.bytes)
  location.reload()
  return true
}
