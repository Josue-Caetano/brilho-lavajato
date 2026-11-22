/** Valor aceito como parâmetro de SQL. `Ref` aponta para o id inserido por um comando anterior da mesma transação. */
export type SqlValue = string | number | null | Ref
export type Ref = { $ref: number }

export interface Stmt {
  sql: string
  params?: SqlValue[]
}

export interface ExecResult {
  rowsAffected: number
  lastInsertId: number
}

/** Abstração do banco: implementada pelo tauri-plugin-sql (app) e pelo sql.js (testes e navegador). */
export interface Db {
  select<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): Promise<T[]>
  execute(sql: string, params?: SqlValue[]): Promise<ExecResult>
  /** Executa os comandos de forma atômica: ou todos entram, ou nenhum. */
  transaction(stmts: Stmt[]): Promise<ExecResult[]>
}

/** Referência ao id inserido pelo comando de índice `index` dentro de uma transação. */
export const ref = (index: number): Ref => ({ $ref: index })

export function isRef(v: unknown): v is Ref {
  return typeof v === 'object' && v !== null && '$ref' in v
}
