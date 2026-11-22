import { backupsParaApagar, backupVencido, juntarCaminho, nomeBackup } from './backup'

describe('backup', () => {
  it('gera nomes ordenáveis', () => {
    expect(nomeBackup(new Date(2026, 9, 18, 14, 30, 5))).toBe('brilho-backup-2026-10-18_14-30-05.db')
  })

  it('mantém apenas os mais recentes e ignora arquivos alheios', () => {
    const nomes = [
      'brilho-backup-2026-10-03_10-00-00.db',
      'brilho-backup-2026-10-01_10-00-00.db',
      'brilho-backup-2026-10-02_10-00-00.db',
      'planilha.xlsx',
      'brilho-backup-qualquer.db',
    ]
    expect(backupsParaApagar(nomes, 2)).toEqual(['brilho-backup-2026-10-01_10-00-00.db'])
    expect(backupsParaApagar(nomes, 30)).toEqual([])
  })

  it('sabe quando o backup venceu', () => {
    const agora = new Date('2026-10-18T14:00:00')
    expect(backupVencido(null, 4, agora)).toBe(true)
    expect(backupVencido('2026-10-18T11:00:00', 4, agora)).toBe(false)
    expect(backupVencido('2026-10-18T09:00:00', 4, agora)).toBe(true)
  })

  it('junta caminhos do Windows e do Linux', () => {
    expect(juntarCaminho('E:\\Backups', 'a.db')).toBe('E:\\Backups\\a.db')
    expect(juntarCaminho('/mnt/pen/', 'a.db')).toBe('/mnt/pen/a.db')
  })
})
