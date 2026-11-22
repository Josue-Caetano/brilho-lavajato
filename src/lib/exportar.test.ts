// @vitest-environment node
import { read, utils } from 'xlsx'
import { criarDbTeste } from '@/test/db'
import { carregarDemo } from '@/db/seed'
import { criarUsuario } from '@/db/repositories/usuarios'
import { gerarRelatorio, ordensDoPeriodo } from '@/db/repositories/relatorios'
import { relatorioParaExcel } from './exportar'

describe('exportação para Excel', () => {
  it('gera abas com valores em reais', async () => {
    const db = await criarDbTeste()
    await criarUsuario(db, 'Dono', '1234', 'dono')
    await carregarDemo(db, new Date(2026, 9, 18, 15, 0))
    const p = { inicio: '2026-10-01', fim: '2026-10-18' }
    const r = await gerarRelatorio(db, p)
    const bytes = relatorioParaExcel(r, await ordensDoPeriodo(db, p), 'Brilho')
    const wb = read(bytes)
    expect(wb.SheetNames).toEqual([
      'Resumo',
      'Por dia',
      'Formas de pagamento',
      'Serviços',
      'Funcionários',
      'Despesas',
      'Horários',
      'Ordens',
    ])
    const resumo = utils.sheet_to_json<unknown[]>(wb.Sheets.Resumo!, { header: 1 })
    expect(resumo[2]).toEqual(['Faturamento', r.resumo.faturamento / 100])
    const ordens = utils.sheet_to_json(wb.Sheets.Ordens!)
    expect(ordens).toHaveLength(r.resumo.carros)
  })
})
