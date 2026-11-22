// @vitest-environment node
import { criarDbTeste } from '@/test/db'
import {
  abrirCaixa,
  caixaAberto,
  fecharCaixa,
  lancarDespesa,
  lancarMovimento,
  listarCaixas,
  resumoCaixa,
} from './caixa'
import { criarCliente, criarVeiculo, quitarFiados } from './clientes'
import { criarOrdem, entregarOrdem } from './ordens'

async function venda(
  db: Awaited<ReturnType<typeof criarDbTeste>>,
  veiculoId: number,
  clienteId: number,
  caixaId: number,
  pagamentos: { forma: 'pix' | 'dinheiro' | 'fiado'; valor: number }[],
) {
  const total = pagamentos.reduce((a, p) => a + p.valor, 0)
  const id = await criarOrdem(db, {
    veiculoId,
    clienteId,
    itens: [{ servico_id: 1, nome: 'Lavagem', preco_unit: total, quantidade: 1 }],
  })
  await entregarOrdem(db, {
    ordemId: id,
    subtotal: total,
    desconto: 0,
    total,
    cortesia: false,
    pagamentos,
    caixaId,
  })
}

describe('caixa', () => {
  it('abre, recebe, lança movimentos e fecha com conferência', async () => {
    const db = await criarDbTeste()
    await db.execute("INSERT INTO servicos (nome) VALUES ('Lavagem')")
    const cli = await criarCliente(db, { nome: 'Ana', telefone: '' })
    const vei = await criarVeiculo(db, cli, { placa: 'ABC1234', modelo: '', cor: '', tipo: 'carro' })

    const caixaId = await abrirCaixa(db, 10000, null)
    await expect(abrirCaixa(db, 0, null)).rejects.toThrow('Já existe')

    await venda(db, vei, cli, caixaId, [{ forma: 'dinheiro', valor: 5000 }])
    await venda(db, vei, cli, caixaId, [{ forma: 'pix', valor: 6000 }])
    await venda(db, vei, cli, caixaId, [{ forma: 'fiado', valor: 4000 }])
    const [fiado] = await db.select<{ id: number }>("SELECT id FROM pagamentos WHERE forma = 'fiado'")
    await quitarFiados(db, [fiado!.id], 'dinheiro', caixaId)

    await lancarMovimento(db, caixaId, 'sangria', 3000, 'Banco')
    await lancarMovimento(db, caixaId, 'suprimento', 1000, 'Troco')
    await lancarDespesa(db, {
      descricao: 'Lanche',
      categoria: 'Alimentação',
      valor: 500,
      data: '2026-10-18T12:00:00',
      caixaId,
    })

    const r = (await resumoCaixa(db, caixaId))!
    expect(r.movimentos.recebido).toEqual({ dinheiro: 9000, pix: 6000, debito: 0, credito: 0 })
    expect(r.fiadoLancado).toBe(4000)
    expect(r.lancamentos.length).toBe(7)

    // esperado em dinheiro: 100 + 90 + 10 - 30 - 5 = 165,00
    const conf = await fecharCaixa(
      db,
      caixaId,
      { dinheiro: 16000, pix: 6000, debito: 0, credito: 0 },
      'Faltou troco',
    )
    expect(conf.linhas.find((l) => l.forma === 'dinheiro')).toMatchObject({
      esperado: 16500,
      diferenca: -500,
    })
    expect(conf.diferenca).toBe(-500)
    expect(await caixaAberto(db)).toBeNull()
    await expect(fecharCaixa(db, caixaId, { dinheiro: 0, pix: 0, debito: 0, credito: 0 })).rejects.toThrow()

    const [h] = await listarCaixas(db)
    expect(h).toMatchObject({
      id: caixaId,
      diferenca: -500,
      recebido: 15000,
      valor_fechamento_informado: 16000,
    })
  })
})
