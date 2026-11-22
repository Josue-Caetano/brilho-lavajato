import initSqlJs from 'sql.js'
import { SqlJsDb } from '@/db/sqljs-db'
import { migrate } from '@/db/migrations'

/** Banco SQLite em memória, já migrado, para testes de repositório. */
export async function criarDbTeste() {
  const SQL = await initSqlJs()
  const db = await SqlJsDb.create(SQL)
  await migrate(db)
  return db
}
