import type { Db } from '../types'
import { m001_inicial } from './001_inicial'
import { m002_agendamentos } from './002_agendamentos'

export interface Migration {
  version: number
  nome: string
  /** Um comando SQL por item — todos rodam numa única transação. */
  statements: string[]
}

/** Lista versionada. Nunca altere uma migration já publicada: crie uma nova. */
export const migrations: Migration[] = [m001_inicial, m002_agendamentos]

export async function migrate(db: Db): Promise<number[]> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version INTEGER PRIMARY KEY,
       nome TEXT NOT NULL,
       aplicada_em TEXT NOT NULL
     )`,
  )
  const rows = await db.select<{ version: number }>('SELECT version FROM schema_migrations')
  const aplicadas = new Set(rows.map((r) => Number(r.version)))
  const novas: number[] = []
  for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
    if (aplicadas.has(m.version)) continue
    await db.transaction([
      ...m.statements.map((sql) => ({ sql })),
      {
        sql: `INSERT INTO schema_migrations (version, nome, aplicada_em) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%S','now','localtime'))`,
        params: [m.version, m.nome],
      },
    ])
    novas.push(m.version)
  }
  return novas
}
