import Database from '@tauri-apps/plugin-sql'
import { invoke } from '@tauri-apps/api/core'
import type { Db, ExecResult, SqlValue, Stmt } from './types'

export const DB_URL = 'sqlite:brilho.db'

/** Banco real do app desktop (tauri-plugin-sql). Transações rodam num comando Rust dedicado. */
export class TauriDb implements Db {
  private constructor(private readonly db: Database) {}

  static async open() {
    const db = await Database.load(DB_URL)
    return new TauriDb(db)
  }

  select<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.db.select<T[]>(sql, params)
  }

  async execute(sql: string, params: SqlValue[] = []): Promise<ExecResult> {
    const r = await this.db.execute(sql, params)
    return { rowsAffected: r.rowsAffected, lastInsertId: Number(r.lastInsertId ?? 0) }
  }

  transaction(stmts: Stmt[]): Promise<ExecResult[]> {
    return invoke<ExecResult[]>('db_transaction', {
      statements: stmts.map((s) => ({ sql: s.sql, params: s.params ?? [] })),
    })
  }
}
