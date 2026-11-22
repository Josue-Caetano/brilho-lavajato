import { calcularDesconto, calcularTotais, precoPorTipo, resumirPagamento } from './ordem'

const servico = { preco_carro: 5000, preco_caminhonete: 7000, preco_moto: 3000 }

describe('preço por tipo de veículo', () => {
  it('usa a coluna certa', () => {
    expect(precoPorTipo(servico, 'carro')).toBe(5000)
    expect(precoPorTipo(servico, 'moto')).toBe(3000)
    expect(precoPorTipo(servico, 'caminhonete')).toBe(7000)
    expect(precoPorTipo(servico, 'van')).toBe(7000)
  })
})

describe('desconto e total', () => {
  const itens = [
    { preco_unit: 8000, quantidade: 1 },
    { preco_unit: 4000, quantidade: 1 },
  ]

  it('desconto em reais e em percentual', () => {
    expect(calcularDesconto(12000, { tipo: 'valor', valor: 1500 })).toBe(1500)
    expect(calcularDesconto(12000, { tipo: 'percentual', valor: 10 })).toBe(1200)
    expect(calcularDesconto(12000, null)).toBe(0)
  })

  it('nunca passa do valor', () => {
    expect(calcularDesconto(1000, { tipo: 'valor', valor: 5000 })).toBe(1000)
    expect(calcularDesconto(1000, { tipo: 'percentual', valor: 150 })).toBe(1000)
    expect(calcularDesconto(1000, { tipo: 'valor', valor: -50 })).toBe(0)
  })

  it('calcula total com desconto', () => {
    expect(calcularTotais(itens, { tipo: 'percentual', valor: 10 })).toEqual({
      subtotal: 12000,
      cortesia: 0,
      desconto: 1200,
      total: 10800,
    })
  })

  it('lavagem grátis zera o serviço principal', () => {
    const t = calcularTotais(itens, null, true)
    expect(t.cortesia).toBe(8000)
    expect(t.total).toBe(4000)
  })

  it('desconto incide após a cortesia', () => {
    const t = calcularTotais(itens, { tipo: 'percentual', valor: 50 }, true)
    expect(t.desconto).toBe(2000)
    expect(t.total).toBe(2000)
  })
})

describe('pagamento e troco', () => {
  it('pagamento exato', () => {
    const r = resumirPagamento(5000, [{ forma: 'pix', valor: 5000 }])
    expect(r.valido).toBe(true)
    expect(r.troco).toBe(0)
    expect(r.restante).toBe(0)
  })

  it('combina formas e calcula troco no dinheiro', () => {
    const r = resumirPagamento(7000, [
      { forma: 'pix', valor: 4000 },
      { forma: 'dinheiro', valor: 5000 },
    ])
    expect(r.valido).toBe(true)
    expect(r.troco).toBe(2000)
    expect(r.porForma.dinheiro).toBe(3000)
    expect(r.porForma.pix).toBe(4000)
  })

  it('aponta valor faltando', () => {
    const r = resumirPagamento(7000, [{ forma: 'pix', valor: 4000 }])
    expect(r.valido).toBe(false)
    expect(r.restante).toBe(3000)
  })

  it('não dá troco sobre cartão', () => {
    const r = resumirPagamento(7000, [{ forma: 'credito', valor: 8000 }])
    expect(r.valido).toBe(false)
    expect(r.troco).toBe(0)
  })

  it('fiado conta como pago', () => {
    const r = resumirPagamento(7000, [{ forma: 'fiado', valor: 7000 }])
    expect(r.valido).toBe(true)
    expect(r.porForma.fiado).toBe(7000)
  })
})
