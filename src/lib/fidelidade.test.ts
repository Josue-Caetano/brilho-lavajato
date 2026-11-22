import { progressoFidelidade, quasePremio } from './fidelidade'

const regra = { ativo: true, lavagens: 10 }

describe('fidelidade', () => {
  it('acumula lavagens', () => {
    expect(progressoFidelidade(3, 0, regra)).toMatchObject({ atual: 3, faltam: 7, premioDisponivel: false })
  })
  it('libera o prêmio ao completar o ciclo', () => {
    expect(progressoFidelidade(10, 0, regra)).toMatchObject({ atual: 10, faltam: 0, premioDisponivel: true })
  })
  it('recomeça depois de usar a cortesia', () => {
    expect(progressoFidelidade(10, 1, regra)).toMatchObject({ atual: 0, premioDisponivel: false })
    expect(progressoFidelidade(13, 1, regra)).toMatchObject({ atual: 3 })
  })
  it('acumula no máximo um prêmio pendente na barra', () => {
    expect(progressoFidelidade(25, 0, regra)).toMatchObject({ atual: 10, premioDisponivel: true })
  })
  it('detecta quem está a 1 lavagem', () => {
    expect(quasePremio(progressoFidelidade(9, 0, regra))).toBe(true)
    expect(quasePremio(progressoFidelidade(8, 0, regra))).toBe(false)
  })
  it('desativada não gera prêmio', () => {
    expect(progressoFidelidade(50, 0, { ativo: false, lavagens: 10 }).premioDisponivel).toBe(false)
  })
})
