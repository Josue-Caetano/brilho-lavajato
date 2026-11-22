import { migrate } from './migrations'
import type { Db } from './types'

export * from './types'

/** Estamos dentro do app desktop (Tauri) ou num navegador comum? */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

const STORAGE_KEY = 'brilho-db-navegador'
let dbPromise: Promise<Db> | null = null
let bancoNavegador: { raw: { export(): Uint8Array } } | null = null

function paraBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** Modo navegador: bytes do banco atual (backup manual). */
export function exportarBancoNavegador(): Uint8Array {
  if (!bancoNavegador) throw new Error('Banco não carregado.')
  return bancoNavegador.raw.export()
}

/** Modo navegador: substitui o banco salvo (restauração); recarregue a página em seguida. */
export function importarBancoNavegador(bytes: Uint8Array) {
  const cabecalho = new TextDecoder().decode(bytes.subarray(0, 15))
  if (cabecalho !== 'SQLite format 3') throw new Error('O arquivo escolhido não é um backup válido.')
  localStorage.setItem(STORAGE_KEY, paraBase64(bytes))
}

async function abrirNavegador(): Promise<Db> {
  // Modo navegador (desenvolvimento/demonstração): SQLite em WebAssembly salvo no localStorage.
  const [{ default: initSqlJs }, { default: wasmUrl }, { SqlJsDb }] = await Promise.all([
    import('sql.js'),
    import('sql.js/dist/sql-wasm.wasm?url'),
    import('./sqljs-db'),
  ])
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  let salvo: Uint8Array | undefined
  try {
    const b64 = localStorage.getItem(STORAGE_KEY)
    if (b64) salvo = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  } catch {
    salvo = undefined
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const db: InstanceType<typeof SqlJsDb> = await SqlJsDb.create(SQL, salvo, () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        const bytes = db.raw.export()
        let bin = ''
        for (let i = 0; i < bytes.length; i += 0x8000)
          bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
        localStorage.setItem(STORAGE_KEY, btoa(bin))
      } catch {
        // Sem espaço no localStorage: segue só em memória.
      }
    }, 300)
  })
  bancoNavegador = db
  return db
}

async function abrir(): Promise<Db> {
  const db = isTauri() ? await (await import('./tauri-db')).TauriDb.open() : await abrirNavegador()
  await migrate(db)
  return db
}

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = abrir().catch((e) => {
      dbPromise = null
      throw e
    })
  }
  return dbPromise
}

/** Apenas para testes: injeta um banco já aberto. */
export function setDbForTests(db: Db | null) {
  dbPromise = db ? Promise.resolve(db) : null
}
