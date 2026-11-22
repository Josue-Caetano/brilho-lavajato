import { linkWhatsApp, preencherModelo, primeiroNome } from './whatsapp'

describe('whatsapp', () => {
  it('preenche variáveis', () => {
    expect(
      preencherModelo('Olá {nome}! Seu {modelo} ({placa}) está pronto. Total: {total}. {empresa}', {
        nome: 'Ana',
        modelo: 'Onix',
        placa: 'ABC1D23',
        total: 'R$ 50,00',
        empresa: 'Brilho',
      }),
    ).toBe('Olá Ana! Seu Onix (ABC1D23) está pronto. Total: R$ 50,00. Brilho')
  })
  it('remove variáveis sem valor', () => {
    expect(preencherModelo('Oi {nome}, tudo bem? {desconhecida}', { nome: 'Rui' })).toBe('Oi Rui, tudo bem?')
  })
  it('monta o link wa.me com DDI 55', () => {
    expect(linkWhatsApp('(11) 98765-4321', 'Olá, tudo bem?')).toBe(
      'https://wa.me/5511987654321?text=Ol%C3%A1%2C%20tudo%20bem%3F',
    )
    expect(linkWhatsApp('123', 'x')).toBeNull()
  })
  it('primeiro nome', () => {
    expect(primeiroNome('  Maria   da Silva ')).toBe('Maria')
  })
})
