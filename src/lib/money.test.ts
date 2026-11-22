import { formatBRL, maskMoneyInput, parseBRL, centsToInput } from './money'

describe('dinheiro', () => {
  it('formata centavos em BRL sem quebrar linha', () => {
    expect(formatBRL(124000)).toBe('R$\u00a01.240,00')
    expect(formatBRL(3550)).toBe('R$\u00a035,50')
    expect(formatBRL(0)).toBe('R$\u00a00,00')
  })

  it('interpreta valores digitados', () => {
    expect(parseBRL('1.240,50')).toBe(124050)
    expect(parseBRL('R$ 35')).toBe(3500)
    expect(parseBRL('35,5')).toBe(3550)
    expect(parseBRL('35.5')).toBe(3550)
    expect(parseBRL('1.240')).toBe(124000)
    expect(parseBRL('abc')).toBeNull()
    expect(parseBRL('')).toBeNull()
  })

  it('mascara a digitação como caixa registradora', () => {
    expect(maskMoneyInput('12345')).toBe('123,45')
    expect(maskMoneyInput('5')).toBe('0,05')
    expect(maskMoneyInput('')).toBe('0,00')
    expect(maskMoneyInput('123456')).toBe('1.234,56')
  })

  it('converte centavos para texto editável', () => {
    expect(centsToInput(3550)).toBe('35,50')
  })
})
