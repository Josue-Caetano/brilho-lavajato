import { clientesSumidos } from './clientes'

describe('clientes sumidos', () => {
  const hoje = new Date(2026, 9, 18)
  const lista = [
    { id: 1, ultimaVisita: '2026-10-10T10:00:00' },
    { id: 2, ultimaVisita: '2026-08-01T10:00:00' },
    { id: 3, ultimaVisita: '2026-09-17T10:00:00' },
    { id: 4, ultimaVisita: null },
  ]
  it('filtra por dias sem vir e ordena do mais antigo', () => {
    const r = clientesSumidos(lista, 30, hoje)
    expect(r.map((c) => c.id)).toEqual([2, 3])
    expect(r[1]!.diasSemVir).toBe(31)
  })
  it('ignora quem nunca veio', () => {
    expect(clientesSumidos(lista, 0, hoje).some((c) => c.id === 4)).toBe(false)
  })
})
