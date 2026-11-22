// @vitest-environment node
import { conferirPin, hashPin, pinValido } from './pin'

describe('PIN', () => {
  it('valida 4 dígitos', () => {
    expect(pinValido('1234')).toBe(true)
    expect(pinValido('12a4')).toBe(false)
    expect(pinValido('12345')).toBe(false)
  })
  it('gera hash com sal e confere', async () => {
    const h = await hashPin('1234')
    expect(h).toMatch(/^[0-9a-f]{32}\$[0-9a-f]{64}$/)
    expect(await conferirPin('1234', h)).toBe(true)
    expect(await conferirPin('4321', h)).toBe(false)
    expect(await hashPin('1234')).not.toBe(h)
  })
})
