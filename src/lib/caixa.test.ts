import { conferirCaixa, esperadoPorForma } from './caixa'

const mov = {
  valorAbertura: 10000,
  recebido: { dinheiro: 15000, pix: 30000, debito: 8000, credito: 5000 },
  suprimentos: 2000,
  sangrias: 5000,
  entradas: 0,
  saidas: 1000,
  despesasDinheiro: 1500,
}

describe('fechamento de caixa', () => {
  it('calcula o esperado na gaveta', () => {
    expect(esperadoPorForma(mov).dinheiro).toBe(10000 + 15000 + 2000 - 5000 - 1000 - 1500)
    expect(esperadoPorForma(mov).pix).toBe(30000)
  })

  it('aponta falta e sobra por forma', () => {
    const c = conferirCaixa(mov, { dinheiro: 19000, pix: 30000, debito: 8000, credito: 5500 })
    const dinheiro = c.linhas.find((l) => l.forma === 'dinheiro')!
    expect(dinheiro.diferenca).toBe(-500)
    expect(c.linhas.find((l) => l.forma === 'credito')!.diferenca).toBe(500)
    expect(c.diferenca).toBe(0)
  })

  it('caixa batendo', () => {
    const c = conferirCaixa(mov, esperadoPorForma(mov))
    expect(c.diferenca).toBe(0)
    expect(c.linhas.every((l) => l.diferenca === 0)).toBe(true)
  })
})
