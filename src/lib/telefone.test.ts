import { formatarTelefone, normalizarTelefone, telefoneValido } from './telefone'

describe('telefone', () => {
  it('formata celular e fixo', () => {
    expect(formatarTelefone('11987654321')).toBe('(11) 98765-4321')
    expect(formatarTelefone('1133334444')).toBe('(11) 3333-4444')
    expect(formatarTelefone('+55 (11) 98765-4321')).toBe('(11) 98765-4321')
  })
  it('funciona como máscara parcial', () => {
    expect(formatarTelefone('1')).toBe('(1')
    expect(formatarTelefone('119')).toBe('(11) 9')
    expect(formatarTelefone('1198765')).toBe('(11) 9876-5')
  })
  it('valida', () => {
    expect(telefoneValido('(11) 98765-4321')).toBe(true)
    expect(telefoneValido('9876')).toBe(false)
    expect(normalizarTelefone(null)).toBe('')
  })
})
