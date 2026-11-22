// @vitest-environment node
import { criarDbTeste } from '@/test/db'
import { buscaGlobal } from './busca'
import { criarCliente, criarVeiculo } from './clientes'

describe('busca global', () => {
  it('encontra por placa parcial, nome e telefone', async () => {
    const db = await criarDbTeste()
    const ana = await criarCliente(db, { nome: 'Ana Paula', telefone: '(11) 98765-4321' })
    await criarVeiculo(db, ana, { placa: 'ABC1D23', modelo: 'Onix', cor: '', tipo: 'carro' })
    await criarCliente(db, { nome: 'Bruno', telefone: '11911112222' })

    expect((await buscaGlobal(db, 'abc-1')).veiculos.map((v) => v.placa)).toEqual(['ABC1D23'])
    expect((await buscaGlobal(db, 'paula')).clientes.map((c) => c.nome)).toEqual(['Ana Paula'])
    expect((await buscaGlobal(db, '1111-2222')).clientes.map((c) => c.nome)).toEqual(['Bruno'])
    expect(await buscaGlobal(db, 'a')).toEqual({ veiculos: [], clientes: [] })
  })
})
