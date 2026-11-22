// @vitest-environment node
import { criarDbTeste } from '@/test/db'
import {
  criarCliente,
  criarVeiculo,
  excluirCliente,
  fiadosDoCliente,
  historicoCliente,
  listarClientesTabela,
  quitarFiados,
} from './clientes'
import { criarOrdem, entregarOrdem } from './ordens'

describe('clientes', () => {
  it('lista com totais, histórico e quitação de fiado', async () => {
    const db = await criarDbTeste()
    const id = await criarCliente(db, { nome: 'Ana', telefone: '(11) 98765-4321' })
    const v = await criarVeiculo(db, id, { placa: 'abc-1234', modelo: 'Gol', cor: 'Prata', tipo: 'carro' })
    await db.execute("INSERT INTO servicos (nome) VALUES ('Lavagem')")
    const ordem = await criarOrdem(db, {
      veiculoId: v,
      clienteId: id,
      itens: [{ servico_id: 1, nome: 'Lavagem', preco_unit: 5000, quantidade: 1 }],
    })
    await entregarOrdem(db, {
      ordemId: ordem,
      subtotal: 5000,
      desconto: 0,
      total: 5000,
      cortesia: false,
      pagamentos: [{ forma: 'fiado', valor: 5000 }],
      caixaId: null,
    })

    const [linha] = await listarClientesTabela(db)
    expect(linha).toMatchObject({
      nome: 'Ana',
      telefone: '11987654321',
      placas: 'ABC1234',
      visitas: 1,
      totalGasto: 5000,
      fiado: 5000,
    })
    expect(await historicoCliente(db, id)).toHaveLength(1)

    const fiados = await fiadosDoCliente(db, id)
    expect(fiados).toHaveLength(1)
    await quitarFiados(
      db,
      fiados.map((f) => f.id),
      'pix',
      null,
    )
    expect(await fiadosDoCliente(db, id)).toHaveLength(0)
    expect((await listarClientesTabela(db))[0]!.fiado).toBe(0)

    expect(await excluirCliente(db, id)).toBe(false)
    const outro = await criarCliente(db, { nome: 'Bia', telefone: '' })
    expect(await excluirCliente(db, outro)).toBe(true)
  })
})

describe('importação', () => {
  it('grava clientes e veículos de uma vez', async () => {
    const { importarClientes, placasCadastradas } = await import('./clientes')
    const db = await criarDbTeste()
    const r = await importarClientes(db, [
      {
        nome: 'Ana',
        telefone: '11987654321',
        observacoes: '',
        aniversario: '03-14',
        veiculos: [
          { placa: 'ABC1234', modelo: 'Gol', cor: '', tipo: 'carro', linha: 2 },
          { placa: 'XYZ1D23', modelo: 'Hilux', cor: '', tipo: 'caminhonete', linha: 3 },
        ],
      },
    ])
    expect(r).toEqual({ clientes: 1, veiculos: 2 })
    expect([...(await placasCadastradas(db))].sort()).toEqual(['ABC1234', 'XYZ1D23'])
  })
})
