import { formatarPlaca, mascararPlaca, normalizarPlaca, placaValida, tipoPlaca } from './placa'

describe('placa', () => {
  it('normaliza para maiúsculas sem símbolos', () => {
    expect(normalizarPlaca('abc-1d23')).toBe('ABC1D23')
    expect(normalizarPlaca(' abc 1234 ')).toBe('ABC1234')
  })

  it('reconhece os dois padrões', () => {
    expect(tipoPlaca('ABC-1234')).toBe('antiga')
    expect(tipoPlaca('abc1d23')).toBe('mercosul')
    expect(tipoPlaca('AB12345')).toBeNull()
    expect(placaValida('ABC1D2')).toBe(false)
  })

  it('aplica máscara durante a digitação', () => {
    expect(mascararPlaca('a')).toBe('A')
    expect(mascararPlaca('abc')).toBe('ABC')
    expect(mascararPlaca('abc1')).toBe('ABC1')
    expect(mascararPlaca('abc12')).toBe('ABC-12')
    expect(mascararPlaca('abc1234')).toBe('ABC-1234')
    expect(mascararPlaca('abc1d')).toBe('ABC1D')
    expect(mascararPlaca('abc1d23')).toBe('ABC1D23')
  })

  it('ignora caracteres no lugar errado e limita o tamanho', () => {
    expect(mascararPlaca('1abc')).toBe('ABC')
    expect(mascararPlaca('abcd1')).toBe('ABC1')
    expect(mascararPlaca('abc1d23999')).toBe('ABC1D23')
    expect(mascararPlaca('abc1dx2')).toBe('ABC1D2')
  })

  it('formata para exibição', () => {
    expect(formatarPlaca('abc1234')).toBe('ABC-1234')
    expect(formatarPlaca('abc1d23')).toBe('ABC1D23')
  })
})
