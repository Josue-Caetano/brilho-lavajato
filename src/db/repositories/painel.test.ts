// @vitest-environment node
import { criarDbTeste } from '@/test/db'
import { carregarDemo } from '../seed'
import {
  faturamentoPorDia,
  kpisDoDia,
  rankingServicos,
  resumoClientes,
  selecionarAniversariantes,
  selecionarQuasePremio,
  selecionarSumidos,
} from './painel'
import { criarUsuario } from './usuarios'

describe('painel', () => {
  const agora = new Date(2026, 9, 18, 15, 0)

  it('calcula KPIs, série de 7 dias e ranking a partir das ordens', async () => {
    const db = await criarDbTeste()
    await criarUsuario(db, 'Dono', '1234', 'dono')
    await carregarDemo(db, agora)
    const k = await kpisDoDia(db, agora)
    expect(k.atendidos).toBeGreaterThan(0)
    expect(k.ticketMedio).toBe(Math.round(k.faturamento / k.atendidos))
    expect(k.naFila).toBeGreaterThan(0)

    const serie = await faturamentoPorDia(db, '2026-10-12', '2026-10-18')
    expect(serie.map((p) => p.dia)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ])
    expect(serie.at(-1)!.faturamento).toBe(k.faturamento)

    const ranking = await rankingServicos(db, '2026-10-01', '2026-10-18')
    expect(ranking.length).toBeGreaterThan(0)
    expect(ranking[0]!.quantidade).toBeGreaterThanOrEqual(ranking.at(-1)!.quantidade)
  })

  it('encontra sumidos, quase-prêmio e aniversariantes', async () => {
    const db = await criarDbTeste()
    await criarUsuario(db, 'Dono', '1234', 'dono')
    await carregarDemo(db, agora)
    const clientes = await resumoClientes(db)
    const sumidos = selecionarSumidos(clientes, 30, agora)
    expect(sumidos.length).toBeGreaterThan(0)
    expect(sumidos.every((c) => c.diasSemVir >= 30)).toBe(true)
    const quase = selecionarQuasePremio(clientes, { ativo: true, lavagens: 10 })
    expect(quase.every((c) => c.fid.faltam <= 1)).toBe(true)
    const aniv = selecionarAniversariantes(
      [
        { ...clientes[0]!, aniversario: '10-20' },
        { ...clientes[1]!, aniversario: '12-25' },
      ],
      agora,
    )
    expect(aniv).toHaveLength(1)
    expect(aniv[0]!.emDias).toBe(2)
  })
})
