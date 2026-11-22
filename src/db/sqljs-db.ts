import type { Database, SqlJsStatic } from 'sql.js'
import { isRef, type Db, type ExecResult, type SqlValue, type Stmt } from './types'

type Bindable = string | number | null

function resolve(params: SqlValue[] = [], results: ExecResult[] = []): Bindable[] {
  return params.map((p) => {
    if (isRef(p)) {
      const r = results[p.$ref]
      if (!r) throw new Error(`Referência inválida: ${p.$ref}`)
      return r.lastInsertId
    }
    return p
  })
}

/** Implementação em memória com sql.js. Usada nos testes e quando o app roda no navegador (modo demonstração). */
export class SqlJsDb implements Db {
  private onChange?: () => void
  constructor(
    readonly raw: Database,
    onChange?: () => void,
  ) {
    this.onChange = onChange
    raw.run('PRAGMA foreign_keys = ON')
  }

  static async create(SQL: SqlJsStatic, data?: Uint8Array, onChange?: () => void) {
    return new SqlJsDb(new SQL.Database(data), onChange)
  }

  async select<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    const stmt = this.raw.prepare(sql)
    try {
      stmt.bind(resolve(params))
      const rows: T[] = []
      while (stmt.step()) rows.push(stmt.getAsObject() as T)
      return rows
    } finally {
      stmt.free()
    }
  }

  private run(sql: string, params: Bindable[]): ExecResult {
    this.raw.run(sql, params)
    const rowsAffected = this.raw.getRowsModified()
    const [res] = this.raw.exec('SELECT last_insert_rowid() AS id')
    return { rowsAffected, lastInsertId: Number(res?.values[0]?.[0] ?? 0) }
  }

  async execute(sql: string, params: SqlValue[] = []): Promise<ExecResult> {
    const r = this.run(sql, resolve(params))
    this.onChange?.()
    return r
  }

  async transaction(stmts: Stmt[]): Promise<ExecResult[]> {
    const results: ExecResult[] = []
    this.raw.run('BEGIN')
    try {
      for (const s of stmts) results.push(this.run(s.sql, resolve(s.params, results)))
      this.raw.run('COMMIT')
    } catch (e) {
      this.raw.run('ROLLBACK')
      throw e
    }
    this.onChange?.()
    return results
  }

  /** Executa SQL bruto com vários comandos (usado pelas migrations). */
  async exec(sql: string) {
    this.raw.exec(sql)
    this.onChange?.()
  }
}
