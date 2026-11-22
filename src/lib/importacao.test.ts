import { interpretarAniversario, interpretarTipo, planejarImportacao, sugerirMapeamento } from './importacao'

describe('importação de planilha', () => {
  it('sugere o mapeamento pelos cabeçalhos', () => {
    expect(sugerirMapeamento(['Cliente', 'Celular', 'Placa', 'Carro', 'Cor', 'Obs.'])).toEqual({
      nome: 0,
      telefone: 1,
      placa: 2,
      modelo: 3,
      cor: 4,
      observacoes: 5,
    })
    expect(sugerirMapeamento(['Data', 'Nome do cliente', 'WhatsApp'])).toEqual({ nome: 1, telefone: 2 })
  })

  it('interpreta tipo e aniversário', () => {
    expect(interpretarTipo('Moto')).toBe('moto')
    expect(interpretarTipo('SUV')).toBe('caminhonete')
    expect(interpretarTipo('Kombi')).toBe('van')
    expect(interpretarTipo('')).toBe('carro')
    expect(interpretarAniversario('14/03')).toBe('03-14')
    expect(interpretarAniversario('14/03/1985')).toBe('03-14')
    expect(interpretarAniversario('1985-03-14')).toBe('03-14')
    expect(interpretarAniversario(31120)).toBe('03-14')
    expect(interpretarAniversario('31/13')).toBeNull()
  })

  it('valida linhas, agrupa veículos por cliente e relata erros', () => {
    const mapa = { nome: 0, telefone: 1, placa: 2, modelo: 3 }
    const linhas = [
      ['Ana Souza', '(11) 98765-4321', 'abc-1234', 'Gol'],
      ['Ana Souza', '11987654321', 'XYZ1D23', 'Hilux'],
      ['', '11999990000', 'DEF5678', 'Onix'],
      ['Bruno', '', 'placa?', 'Kwid'],
      ['Carla', '', 'ABC1234', 'Uno'],
      ['Davi', '123', 'GHI9J88', 'Polo'],
      ['Eva', '', 'JKL0000', 'Fox'],
      [],
    ]
    const plano = planejarImportacao(linhas, mapa, new Set(['JKL0000']))
    expect(plano.totalLinhas).toBe(7)
    expect(plano.clientes).toHaveLength(1)
    expect(plano.clientes[0]!.veiculos.map((v) => v.placa)).toEqual(['ABC1234', 'XYZ1D23'])
    expect(plano.clientes[0]!.veiculos.map((v) => v.tipo)).toEqual(['carro', 'carro'])
    const moto = planejarImportacao([['Rui', '', 'MNO1234', 'Moto Honda Biz']], mapa, new Set())
    expect(moto.clientes[0]!.veiculos[0]!.tipo).toBe('moto')
    expect(plano.erros.map((e) => [e.linha, e.motivo])).toEqual([
      [4, 'Nome do cliente vazio'],
      [5, 'Placa inválida (placa?)'],
      [6, 'Placa ABC1234 repetida na planilha'],
      [7, 'Telefone inválido (123)'],
      [8, 'Placa JKL0000 já cadastrada'],
    ])
  })
})
