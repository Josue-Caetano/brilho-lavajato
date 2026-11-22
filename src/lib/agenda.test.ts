import { diaFechado, diasDaSemana, gerarHorarios, horariosDoDia, sobrepostos } from './agenda'

const cfg = { abre: '08:00', fecha: '12:00', intervaloMin: 60, vagas: 2, diasFechados: [0] }
const agora = new Date(2026, 9, 18, 7, 0) // domingo, 07:00

describe('agenda', () => {
  it('gera os horários de início do expediente', () => {
    expect(gerarHorarios(cfg)).toEqual(['08:00', '09:00', '10:00', '11:00'])
    expect(gerarHorarios({ ...cfg, intervaloMin: 30, fecha: '09:00' })).toEqual(['08:00', '08:30'])
  })

  it('respeita dias fechados', () => {
    expect(diaFechado('2026-10-18', cfg)).toBe(true) // domingo
    expect(horariosDoDia('2026-10-18', [], cfg, 60, agora)).toEqual([])
  })

  it('conta sobreposição ignorando cancelados e faltas', () => {
    const ags = [
      { data_hora: '2026-10-19T08:00:00', duracao_min: 90, status: 'agendado' as const },
      { data_hora: '2026-10-19T09:00:00', duracao_min: 60, status: 'cancelado' as const },
      { data_hora: '2026-10-20T09:00:00', duracao_min: 60, status: 'agendado' as const },
    ]
    expect(sobrepostos('2026-10-19', 540, 600, ags)).toBe(1) // 09:00–10:00
    expect(sobrepostos('2026-10-19', 600, 660, ags)).toBe(0)
  })

  it('marca horário cheio quando as vagas acabam durante o serviço', () => {
    const ags = [
      { id: 1, data_hora: '2026-10-19T09:00:00', duracao_min: 60, status: 'confirmado' as const },
      { id: 2, data_hora: '2026-10-19T09:00:00', duracao_min: 60, status: 'agendado' as const },
    ]
    const h = horariosDoDia('2026-10-19', ags, cfg, 120, agora)
    expect(h.map((x) => [x.hora, x.livre])).toEqual([
      ['08:00', false], // serviço de 2h atravessa as 09:00, que estão lotadas
      ['09:00', false],
      ['10:00', true],
      ['11:00', true],
    ])
    // Editando o agendamento 2, a vaga dele não conta contra ele mesmo
    expect(horariosDoDia('2026-10-19', ags, cfg, 60, agora, 2).find((x) => x.hora === '09:00')!.livre).toBe(
      true,
    )
  })

  it('não oferece horário que já passou', () => {
    const h = horariosDoDia('2026-10-19', [], cfg, 60, new Date(2026, 9, 19, 9, 30))
    expect(h.map((x) => x.livre)).toEqual([false, false, true, true])
  })

  it('lista a semana de domingo a sábado', () => {
    expect(diasDaSemana('2026-10-21')).toEqual([
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ])
  })
})
