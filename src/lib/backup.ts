import { format } from 'date-fns'

/** Nome do arquivo de backup: brilho-backup-2026-10-18_14-30-05.db (ordena por data). */
export function nomeBackup(d: Date = new Date()): string {
  return `brilho-backup-${format(d, 'yyyy-MM-dd_HH-mm-ss')}.db`
}

export const PADRAO_BACKUP = /^brilho-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.db$/

/** Quais arquivos apagar para manter só os `manter` backups mais recentes. */
export function backupsParaApagar(nomes: string[], manter: number): string[] {
  const nossos = nomes.filter((n) => PADRAO_BACKUP.test(n)).sort()
  return nossos.slice(0, Math.max(0, nossos.length - Math.max(1, manter)))
}

/** Já passou o intervalo desde o último backup? */
export function backupVencido(
  ultimo: string | null,
  intervaloHoras: number,
  agora: Date = new Date(),
): boolean {
  if (!ultimo) return true
  return agora.getTime() - new Date(ultimo).getTime() >= intervaloHoras * 3_600_000
}

export function juntarCaminho(pasta: string, arquivo: string): string {
  const sep = pasta.includes('\\') ? '\\' : '/'
  return pasta.endsWith(sep) ? `${pasta}${arquivo}` : `${pasta}${sep}${arquivo}`
}
