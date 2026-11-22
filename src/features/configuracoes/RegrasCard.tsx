import { useState } from 'react'
import { toast } from 'sonner'
import { queryClient, qk } from '@/app/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getDb } from '@/db'
import { stmtSalvarConfig, type Configuracoes } from '@/db/repositories/configuracoes'
import { mensagemErro } from '@/lib/erros'
import { Secao } from './comum'

/** Regra de fidelidade, meta diária e dias para considerar um cliente sumido. */
export function RegrasCard({ cfg }: { cfg: Configuracoes }) {
  const [ativo, setAtivo] = useState(cfg.fidelidade.ativo)
  const [lavagens, setLavagens] = useState(String(cfg.fidelidade.lavagens))
  const [meta, setMeta] = useState(String(cfg.metaDiaria))
  const [dias, setDias] = useState(String(cfg.diasSumido))
  const [salvando, setSalvando] = useState(false)

  const n = (v: string, min: number, max: number) => {
    const x = parseInt(v, 10)
    return Number.isFinite(x) && x >= min && x <= max ? x : null
  }
  const nLav = n(lavagens, 2, 50)
  const nMeta = n(meta, 1, 500)
  const nDias = n(dias, 7, 365)

  const salvar = async () => {
    if (nLav === null || nMeta === null || nDias === null) return
    setSalvando(true)
    try {
      await (
        await getDb()
      ).transaction([
        stmtSalvarConfig('fidelidade', { ativo, lavagens: nLav }),
        stmtSalvarConfig('metaDiaria', nMeta),
        stmtSalvarConfig('diasSumido', nDias),
      ])
      await queryClient.invalidateQueries({ queryKey: qk.config })
      toast.success('Regras salvas.')
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Secao
      titulo="Fidelidade e metas"
      descricao="A fidelidade é calculada a partir das lavagens entregues de cada cliente."
    >
      <label className="flex items-center gap-3">
        <Switch checked={ativo} onCheckedChange={setAtivo} aria-label="Ativar programa de fidelidade" />
        <span className="font-medium">Programa de fidelidade ativo</span>
      </label>
      <div className="grid grid-cols-3 gap-4">
        <Field
          label="A cada quantas lavagens, 1 grátis"
          htmlFor="rg-lav"
          error={nLav === null ? 'Entre 2 e 50' : undefined}
        >
          <Input
            id="rg-lav"
            type="number"
            min={2}
            max={50}
            value={lavagens}
            disabled={!ativo}
            onChange={(e) => setLavagens(e.target.value)}
          />
        </Field>
        <Field
          label="Meta diária de carros"
          htmlFor="rg-meta"
          error={nMeta === null ? 'Entre 1 e 500' : undefined}
        >
          <Input id="rg-meta" type="number" min={1} value={meta} onChange={(e) => setMeta(e.target.value)} />
        </Field>
        <Field
          label="Cliente sumido após (dias)"
          htmlFor="rg-dias"
          error={nDias === null ? 'Entre 7 e 365' : undefined}
        >
          <Input id="rg-dias" type="number" min={7} value={dias} onChange={(e) => setDias(e.target.value)} />
        </Field>
      </div>
      <Button
        variant="primary"
        className="self-start"
        onClick={salvar}
        loading={salvando}
        disabled={nLav === null || nMeta === null || nDias === null}
      >
        Salvar regras
      </Button>
    </Secao>
  )
}
