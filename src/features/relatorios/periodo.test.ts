import { periodoDoAtalho } from './periodo'

describe('períodos', () => {
  const hoje = new Date(2026, 9, 18)
  it('calcula os atalhos', () => {
    expect(periodoDoAtalho('hoje', hoje)).toEqual({ inicio: '2026-10-18', fim: '2026-10-18' })
    expect(periodoDoAtalho('7dias', hoje)).toEqual({ inicio: '2026-10-12', fim: '2026-10-18' })
    expect(periodoDoAtalho('mes', hoje)).toEqual({ inicio: '2026-10-01', fim: '2026-10-18' })
  })
})
