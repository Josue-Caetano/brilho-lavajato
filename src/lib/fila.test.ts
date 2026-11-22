import { esperaMedia, etapaAnterior, proximaEtapa, tempoNaEtapa, tempoPrevistoEtapa } from './fila'

describe('fila', () => {
  it('navega entre etapas', () => {
    expect(proximaEtapa('aguardando')).toBe('lavando')
    expect(proximaEtapa('pronto')).toBeNull()
    expect(etapaAnterior('lavando')).toBe('aguardando')
    expect(etapaAnterior('aguardando')).toBeNull()
  })

  it('tempo previsto por etapa', () => {
    expect(tempoPrevistoEtapa('aguardando', 50)).toBe(20)
    expect(tempoPrevistoEtapa('lavando', 60)).toBe(39)
    expect(tempoPrevistoEtapa('acabamento', 60)).toBe(21)
    expect(tempoPrevistoEtapa('pronto', 60)).toBe(60)
  })

  it('mede o tempo desde o início da etapa e marca atraso', () => {
    const agora = new Date(2026, 9, 18, 10, 0)
    const base = {
      entrada_em: '2026-10-18T09:00:00',
      acabamento_em: null,
      pronto_em: null,
      duracao_prevista: 30,
    }
    const lavando = tempoNaEtapa({ ...base, status: 'lavando', inicio_em: '2026-10-18T09:50:00' }, agora)
    expect(lavando.minutos).toBe(10)
    expect(lavando.atrasado).toBe(false)
    const esperando = tempoNaEtapa({ ...base, status: 'aguardando', inicio_em: null }, agora)
    expect(esperando.minutos).toBe(60)
    expect(esperando.atrasado).toBe(true)
  })

  it('espera média', () => {
    const agora = new Date(2026, 9, 18, 10, 0)
    expect(esperaMedia(['2026-10-18T09:40:00', '2026-10-18T09:20:00'], agora)).toBe(30)
    expect(esperaMedia([], agora)).toBe(0)
  })
})
