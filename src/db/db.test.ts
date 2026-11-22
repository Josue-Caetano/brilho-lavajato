// @vitest-environment node
import { criarDbTeste } from '@/test/db'
import { migrate, migrations } from './migrations'
import { carregarDemo, removerDemo, temDadosDemo } from './seed'
import { criarUsuario } from './repositories/usuarios'
import { ref } from './types'

describe('banco de dados', () => {
  it('aplica as migrations uma única vez', async () => {
    const db = await criarDbTeste()
    expect(await migrate(db)).toEqual([])
    const rows = await db.select<{ version: number }>('SELECT version FROM schema_migrations')
    expect(rows.map((r) => r.version)).toEqual(migrations.map((m) => m.version))
  })

  it('transação desfaz tudo quando um comando falha', async () => {
    const db = await criarDbTeste()
    await expect(
      db.transaction([
        { sql: "INSERT INTO clientes (nome, criado_em) VALUES ('A', '2026-01-01T00:00:00')" },
        { sql: 'INSERT INTO tabela_que_nao_existe VALUES (1)' },
      ]),
    ).rejects.toThrow()
    expect(await db.select('SELECT * FROM clientes')).toHaveLength(0)
  })

  it('transação resolve referências ao id inserido', async () => {
    const db = await criarDbTeste()
    await db.transaction([
      { sql: "INSERT INTO clientes (nome, criado_em) VALUES ('A', '2026-01-01T00:00:00')" },
      {
        sql: "INSERT INTO veiculos (cliente_id, placa, tipo, criado_em) VALUES (?, 'ABC1D23', 'carro', '2026-01-01T00:00:00')",
        params: [ref(0)],
      },
    ])
    const [v] = await db.select<{ cliente_id: number }>('SELECT cliente_id FROM veiculos')
    const [c] = await db.select<{ id: number }>('SELECT id FROM clientes')
    expect(v!.cliente_id).toBe(c!.id)
  })

  it('placa é única', async () => {
    const db = await criarDbTeste()
    await db.execute("INSERT INTO clientes (nome, criado_em) VALUES ('A', 'x')")
    await db.execute("INSERT INTO veiculos (cliente_id, placa, criado_em) VALUES (1, 'ABC1234', 'x')")
    await expect(
      db.execute("INSERT INTO veiculos (cliente_id, placa, criado_em) VALUES (1, 'ABC1234', 'x')"),
    ).rejects.toThrow()
  })
})

describe('dados de demonstração', () => {
  it('carrega histórico realista e remove sem deixar rastro', async () => {
    const db = await criarDbTeste()
    await criarUsuario(db, 'Dono', '1234', 'dono')
    await db.execute("INSERT INTO clientes (nome, criado_em) VALUES ('Cliente real', '2026-01-01T00:00:00')")

    const agora = new Date(2026, 9, 18, 15, 0)
    await carregarDemo(db, agora)
    expect(await temDadosDemo(db)).toBe(true)

    const [c] = await db.select<{ n: number }>('SELECT COUNT(*) AS n FROM clientes WHERE demo = 1')
    expect(c!.n).toBe(15)
    const [o] = await db.select<{ n: number }>("SELECT COUNT(*) AS n FROM ordens WHERE status = 'entregue'")
    expect(o!.n).toBeGreaterThan(150)
    const fila = await db.select<{ status: string }>(
      "SELECT status FROM ordens WHERE status NOT IN ('entregue','cancelada')",
    )
    expect(fila.length).toBe(6)
    const ags = await db.select<{ n: number }>('SELECT COUNT(*) AS n FROM agendamentos')
    expect(ags[0]!.n).toBe(8)
    const dias = await db.select('SELECT DISTINCT date(entregue_em) FROM ordens WHERE entregue_em >= ?', [
      '2026-09-18',
    ])
    expect(dias.length).toBeGreaterThanOrEqual(30)
    // Pagamentos batem com o total de cada ordem entregue
    const divergentes = await db.select(
      `SELECT o.id FROM ordens o LEFT JOIN pagamentos p ON p.ordem_id = o.id
       WHERE o.status = 'entregue' GROUP BY o.id HAVING COALESCE(SUM(p.valor), 0) <> o.total`,
    )
    expect(divergentes).toHaveLength(0)
    // Carregar de novo não duplica
    await carregarDemo(db, agora)
    const [c2] = await db.select<{ n: number }>('SELECT COUNT(*) AS n FROM clientes WHERE demo = 1')
    expect(c2!.n).toBe(15)

    await removerDemo(db)
    expect(await temDadosDemo(db)).toBe(false)
    expect(await db.select('SELECT * FROM ordens')).toHaveLength(0)
    expect(await db.select('SELECT * FROM agendamentos')).toHaveLength(0)
    expect(await db.select('SELECT * FROM veiculos')).toHaveLength(0)
    const restantes = await db.select<{ nome: string }>('SELECT nome FROM clientes')
    expect(restantes.map((r) => r.nome)).toEqual(['Cliente real'])
    const usuarios = await db.select<{ nome: string }>('SELECT nome FROM usuarios')
    expect(usuarios.map((u) => u.nome)).toEqual(['Dono'])
  })
})
