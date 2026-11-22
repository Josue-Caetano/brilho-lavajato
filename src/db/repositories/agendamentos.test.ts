// @vitest-environment node
import { criarDbTeste } from '@/test/db'
import {
  atualizarAgendamento,
  contarAgendadosHoje,
  criarAgendamento,
  listarAgendamentos,
  mudarStatusAgendamento,
  registrarChegada,
  type AgendamentoInput,
} from './agendamentos'
import { criarCliente, criarVeiculo } from './clientes'
import { listarFila } from './ordens'

const base: AgendamentoInput = {
  data_hora: '2026-10-19T09:00:00',
  duracao_min: 50,
  cliente_id: null,
  veiculo_id: null,
  nome: 'Paula Nunes',
  telefone: '(11) 97777-6666',
  placa: 'xyz-9a88',
  modelo: 'Pulse',
  cor: 'Vermelho',
  tipo: 'carro',
  servicos: [{ servico_id: 1, nome: 'Lavagem completa', preco_unit: 6000 }],
  observacoes: 'vem às 9h',
}

async function preparar() {
  const db = await criarDbTeste()
  await db.execute("INSERT INTO servicos (nome, preco_carro) VALUES ('Lavagem completa', 6000)")
  return db
}

describe('agendamentos', () => {
  it('cria, lista e edita guardando os dados digitados', async () => {
    const db = await preparar()
    const id = await criarAgendamento(db, base)
    await atualizarAgendamento(db, id, { ...base, data_hora: '2026-10-19T10:00:00' })
    const [a] = await listarAgendamentos(db, '2026-10-19', '2026-10-19')
    expect(a).toMatchObject({
      nome: 'Paula Nunes',
      telefone: '11977776666',
      placa: 'XYZ9A88',
      total: 6000,
      status: 'agendado',
    })
    expect(a!.data_hora).toBe('2026-10-19T10:00:00')
    expect(a!.servicos).toHaveLength(1)
    expect(await contarAgendadosHoje(db, '2026-10-19')).toBe(1)
  })

  it('cliente novo chega: cadastra, põe na fila e liga a ordem', async () => {
    const db = await preparar()
    const id = await criarAgendamento(db, base)
    const ordemId = await registrarChegada(db, id, null)
    const fila = await listarFila(db)
    expect(fila).toHaveLength(1)
    expect(fila[0]).toMatchObject({ id: ordemId, placa: 'XYZ9A88', cliente_nome: 'Paula Nunes', total: 6000 })
    const [a] = await listarAgendamentos(db, '2026-10-19', '2026-10-19')
    expect(a).toMatchObject({ status: 'chegou', ordem_id: ordemId })
    expect(a!.cliente_id).not.toBeNull()
    await expect(registrarChegada(db, id, null)).rejects.toThrow('já chegou')
    expect(await contarAgendadosHoje(db, '2026-10-19')).toBe(0)
  })

  it('reaproveita veículo cadastrado depois do agendamento', async () => {
    const db = await preparar()
    const id = await criarAgendamento(db, base)
    const cli = await criarCliente(db, { nome: 'Paula N.', telefone: '' })
    await criarVeiculo(db, cli, { placa: 'XYZ9A88', modelo: 'Pulse', cor: '', tipo: 'carro' })
    await registrarChegada(db, id, null)
    const clientes = await db.select('SELECT * FROM clientes')
    expect(clientes).toHaveLength(1)
  })

  it('cancelado não vai para a fila', async () => {
    const db = await preparar()
    const id = await criarAgendamento(db, base)
    await mudarStatusAgendamento(db, id, 'cancelado')
    await expect(registrarChegada(db, id, null)).rejects.toThrow('cancelado')
  })
})
