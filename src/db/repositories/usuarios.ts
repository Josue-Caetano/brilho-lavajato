import { agoraIso } from '@/lib/datas'
import { conferirPin, hashPin } from '@/lib/pin'
import type { Db } from '../types'

export type Papel = 'dono' | 'funcionario'

export interface Usuario {
  id: number
  nome: string
  papel: Papel
  ativo: number
}

export async function listarUsuarios(db: Db, apenasAtivos = false): Promise<Usuario[]> {
  return db.select<Usuario>(
    `SELECT id, nome, papel, ativo FROM usuarios ${apenasAtivos ? 'WHERE ativo = 1' : ''}
     ORDER BY papel = 'dono' DESC, nome COLLATE NOCASE`,
  )
}

export async function contarUsuarios(db: Db): Promise<number> {
  const [r] = await db.select<{ n: number }>('SELECT COUNT(*) AS n FROM usuarios')
  return Number(r?.n ?? 0)
}

export async function stmtCriarUsuario(nome: string, pin: string, papel: Papel, demo = false) {
  return {
    sql: 'INSERT INTO usuarios (nome, pin_hash, papel, ativo, criado_em, demo) VALUES (?, ?, ?, 1, ?, ?)',
    params: [nome.trim(), await hashPin(pin), papel, agoraIso(), demo ? 1 : 0],
  }
}

export async function criarUsuario(db: Db, nome: string, pin: string, papel: Papel) {
  const s = await stmtCriarUsuario(nome, pin, papel)
  return (await db.execute(s.sql, s.params)).lastInsertId
}

export async function atualizarUsuario(
  db: Db,
  id: number,
  dados: { nome: string; papel: Papel; ativo: boolean; pin?: string },
) {
  if (dados.pin) {
    await db.execute('UPDATE usuarios SET pin_hash = ? WHERE id = ?', [await hashPin(dados.pin), id])
  }
  await db.execute('UPDATE usuarios SET nome = ?, papel = ?, ativo = ? WHERE id = ?', [
    dados.nome.trim(),
    dados.papel,
    dados.ativo ? 1 : 0,
    id,
  ])
}

/** Confere o PIN e devolve o usuário, ou null se estiver errado. */
export async function autenticar(db: Db, id: number, pin: string): Promise<Usuario | null> {
  const [u] = await db.select<Usuario & { pin_hash: string }>(
    'SELECT id, nome, papel, ativo, pin_hash FROM usuarios WHERE id = ? AND ativo = 1',
    [id],
  )
  if (!u || !(await conferirPin(pin, u.pin_hash))) return null
  return { id: u.id, nome: u.nome, papel: u.papel, ativo: u.ativo }
}

/** Impede desativar/rebaixar o último dono ativo. */
export async function contarDonosAtivos(db: Db): Promise<number> {
  const [r] = await db.select<{ n: number }>(
    "SELECT COUNT(*) AS n FROM usuarios WHERE papel = 'dono' AND ativo = 1",
  )
  return Number(r?.n ?? 0)
}
