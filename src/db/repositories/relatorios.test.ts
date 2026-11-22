// @vitest-environment node
import { criarDbTeste } from '@/test/db'
import { carregarDemo } from '../seed'
import { gerarRelatorio, ordensDoPeriodo } from './relatorios'
import { criarUsuario } from './usuarios'

describe('relatórios', () => {
  it('consolida o período de forma consistente', async () => {
    const db = await criarDbTeste()
    await criarUsuario(db, 'Dono', '1234', 'dono')
    await carregarDemo(db, new Date(2026, 9, 18, 15, 0))
    const p = { inicio: '2026-10-01', fim: '2026-10-18' }
    const r = await gerarRelatorio(db, p)

    expect(r.resumo.carros).toBeGreaterThan(50)
    expect(r.resumo.lucro).toBe(r.resumo.faturamento - r.resumo.despesas)
    // A soma por dia, por forma e por funcionário bate com o faturamento
    expect(r.porDia.reduce((a, d) => a + d.faturamento, 0)).toBe(r.resumo.faturamento)
    expect(r.formas.reduce((a, f) => a + f.valor, 0)).toBe(r.resumo.faturamento)
    expect(r.funcionarios.reduce((a, f) => a + f.faturamento, 0)).toBe(r.resumo.faturamento)
    expect(r.calor.reduce((a, c) => a + c.carros, 0)).toBeGreaterThanOrEqual(r.resumo.carros)
    expect(r.clientes.novos + r.clientes.recorrentes).toBeGreaterThan(0)
    expect(r.clientes.faturamentoNovos + r.clientes.faturamentoRecorrentes).toBe(r.resumo.faturamento)
    expect((await ordensDoPeriodo(db, p)).length).toBe(r.resumo.carros)
  })
})
