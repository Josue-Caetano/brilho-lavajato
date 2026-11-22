import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Segmented } from '@/components/ui/misc'
import type { Configuracoes } from '@/db/repositories/configuracoes'
import { gerarHorarios, paraMinutos } from '@/lib/agenda'
import { cn } from '@/lib/utils'
import { gravarConfig, Secao } from './comum'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function AgendaSecao({ cfg }: { cfg: Configuracoes }) {
  const [a, setA] = useState(cfg.agenda)
  const [salvando, setSalvando] = useState(false)
  const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h)
  const valido =
    horaValida(a.abre) && horaValida(a.fecha) && paraMinutos(a.abre) < paraMinutos(a.fecha) && a.vagas >= 1
  const horarios = valido ? gerarHorarios(a) : []

  return (
    <Secao
      titulo="Agenda"
      descricao="Horário de funcionamento e quantos carros dá para atender ao mesmo tempo."
    >
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Field label="Abre às" htmlFor="ag-abre">
          <Input
            id="ag-abre"
            type="time"
            value={a.abre}
            onChange={(e) => setA((x) => ({ ...x, abre: e.target.value }))}
          />
        </Field>
        <Field label="Fecha às" htmlFor="ag-fecha" error={valido ? undefined : 'Confira os horários'}>
          <Input
            id="ag-fecha"
            type="time"
            value={a.fecha}
            onChange={(e) => setA((x) => ({ ...x, fecha: e.target.value }))}
          />
        </Field>
        <Field label="Carros ao mesmo tempo" htmlFor="ag-vagas" hint="Boxes ou equipes trabalhando juntos">
          <Input
            id="ag-vagas"
            type="number"
            min={1}
            max={20}
            value={a.vagas}
            onChange={(e) =>
              setA((x) => ({ ...x, vagas: Math.min(20, Math.max(1, Number(e.target.value) || 1)) }))
            }
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="min-h-6 text-sm font-medium">Intervalo entre horários</span>
          <Segmented
            aria-label="Intervalo entre horários"
            className="w-full [&>button]:flex-1 [&>button]:px-2 [&>button]:whitespace-nowrap"
            value={String(a.intervaloMin)}
            onChange={(v) => setA((x) => ({ ...x, intervaloMin: Number(v) }))}
            options={[
              { value: '15', label: '15 min' },
              { value: '30', label: '30 min' },
              { value: '60', label: '1 h' },
            ]}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Dias de funcionamento</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Dias de funcionamento">
          {DIAS.map((d, i) => {
            const aberto = !a.diasFechados.includes(i)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={aberto}
                onClick={() =>
                  setA((x) => ({
                    ...x,
                    diasFechados: aberto
                      ? [...x.diasFechados, i].sort()
                      : x.diasFechados.filter((y) => y !== i),
                  }))
                }
                className={cn(
                  'h-11 w-16 rounded-[var(--radius-btn)] border text-sm font-semibold transition-colors',
                  aberto
                    ? 'border-primary bg-primary-tint text-primary'
                    : 'border-border bg-surface-2 text-muted line-through',
                )}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>
      {valido && (
        <p className="text-muted text-sm">
          {horarios.length} horários por dia ({horarios[0]} a {horarios.at(-1)}), até {a.vagas}{' '}
          {a.vagas === 1 ? 'carro' : 'carros'} por horário.
        </p>
      )}
      <Button
        variant="primary"
        className="self-start"
        disabled={!valido}
        loading={salvando}
        onClick={async () => {
          setSalvando(true)
          await gravarConfig('agenda', a, 'Agenda salva.')
          setSalvando(false)
        }}
      >
        Salvar agenda
      </Button>
    </Secao>
  )
}
