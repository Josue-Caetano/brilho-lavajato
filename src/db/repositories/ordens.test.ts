// @vitest-environment node
import { criarDbTeste } from '@/test/db'
import { buscarPorPlaca, contagemFidelidade } from './clientes'
import { contarFila, criarOrdem, entregarOrdem, listarFila, moverOrdem, obterOrdem } from './ordens'

const regra = { ativo: true, lavagens: 3 }
const item = { servico_id: 1, nome: 'Lavagem simples', preco_unit: 4000, quantidade: 1 }

async function preparar() {
  const db = await criarDbTeste()
  await db.execute(
    "INSERT INTO servicos (nome, preco_carro, preco_caminhonete, preco_moto, duracao_min) VALUES ('Lavagem simples', 4000, 5500, 2500, 30)",
  )
  return db
}

describe('ordens', () => {
  it('cadastra cliente, veículo e ordem de uma vez', async () => {
    const db = await preparar()
    const id = await criarOrdem(db, {
      novoCliente: { nome: 'Ana', telefone: '11987654321' },
      novoVeiculo: { placa: 'ABC1D23', modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
      itens: [item],
    })
    const o = await obterOrdem(db, id)
    expect(o).toMatchObject({
      numero: 1,
      status: 'aguardando',
      placa: 'ABC1D23',
      cliente_nome: 'Ana',
      total: 4000,
    })
    expect(o!.itens).toHaveLength(1)
    expect(await contarFila(db)).toBe(1)
  })

  it('numera as ordens em sequência e reaproveita o veículo existente', async () => {
    const db = await preparar()
    await criarOrdem(db, {
      novoCliente: { nome: 'Ana', telefone: '' },
      novoVeiculo: { placa: 'ABC1D23', modelo: '', cor: '', tipo: 'carro' },
      itens: [item],
    })
    const h = await buscarPorPlaca(db, 'abc-1d23', regra)
    expect(h?.cliente.nome).toBe('Ana')
    expect(h?.naFila).toBe(true)
    const id2 = await criarOrdem(db, { veiculoId: h!.veiculo.id, clienteId: h!.cliente.id, itens: [item] })
    expect((await obterOrdem(db, id2))!.numero).toBe(2)
  })

  it('não grava nada se a placa já existir em outro cadastro', async () => {
    const db = await preparar()
    const base = {
      novoVeiculo: { placa: 'ABC1D23', modelo: '', cor: '', tipo: 'carro' as const },
      itens: [item],
    }
    await criarOrdem(db, { ...base, novoCliente: { nome: 'Ana', telefone: '' } })
    await expect(criarOrdem(db, { ...base, novoCliente: { nome: 'Bia', telefone: '' } })).rejects.toThrow()
    const clientes = await db.select('SELECT * FROM clientes')
    expect(clientes).toHaveLength(1)
  })

  it('move entre etapas registrando horários e limpando ao voltar', async () => {
    const db = await preparar()
    const id = await criarOrdem(db, {
      novoCliente: { nome: 'Ana', telefone: '' },
      novoVeiculo: { placa: 'ABC1D23', modelo: '', cor: '', tipo: 'carro' },
      itens: [item],
    })
    await moverOrdem(db, id, 'pronto', '2026-10-18T10:00:00')
    let o = await obterOrdem(db, id)
    expect(o).toMatchObject({
      status: 'pronto',
      inicio_em: '2026-10-18T10:00:00',
      pronto_em: '2026-10-18T10:00:00',
    })
    await moverOrdem(db, id, 'lavando', '2026-10-18T10:05:00')
    o = await obterOrdem(db, id)
    expect(o).toMatchObject({
      status: 'lavando',
      inicio_em: '2026-10-18T10:05:00',
      acabamento_em: null,
      pronto_em: null,
    })
  })

  it('entregar e cobrar grava pagamentos e alimenta a fidelidade', async () => {
    const db = await preparar()
    const id = await criarOrdem(db, {
      novoCliente: { nome: 'Ana', telefone: '' },
      novoVeiculo: { placa: 'ABC1D23', modelo: '', cor: '', tipo: 'carro' },
      itens: [item],
    })
    await entregarOrdem(db, {
      ordemId: id,
      subtotal: 4000,
      desconto: 0,
      total: 4000,
      cortesia: false,
      pagamentos: [
        { forma: 'pix', valor: 1500 },
        { forma: 'dinheiro', valor: 2500 },
        { forma: 'credito', valor: 0 },
      ],
      caixaId: null,
    })
    expect(await listarFila(db)).toHaveLength(0)
    const pags = await db.select<{ forma: string; valor: number }>(
      'SELECT forma, valor FROM pagamentos ORDER BY id',
    )
    expect(pags).toEqual([
      { forma: 'pix', valor: 1500 },
      { forma: 'dinheiro', valor: 2500 },
    ])
    const [c] = await db.select<{ id: number }>('SELECT id FROM clientes')
    expect(await contagemFidelidade(db, c!.id)).toEqual({ pagas: 1, cortesias: 0 })
  })
})
