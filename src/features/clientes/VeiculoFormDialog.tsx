import { useState } from 'react'
import { toast } from 'sonner'
import { invalidarMovimento } from '@/app/queries'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Segmented } from '@/components/ui/misc'
import { getDb } from '@/db'
import { atualizarVeiculo, criarVeiculo, type Veiculo } from '@/db/repositories/clientes'
import { mensagemErro } from '@/lib/erros'
import { TIPOS_VEICULO, type TipoVeiculo } from '@/lib/ordem'
import { formatarPlaca, mascararPlaca, placaValida } from '@/lib/placa'

export function VeiculoFormDialog({
  clienteId,
  veiculo,
  aberto,
  onFechar,
}: {
  clienteId: number
  veiculo?: Veiculo | null
  aberto: boolean
  onFechar: () => void
}) {
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent size="sm">
        {aberto && <Conteudo clienteId={clienteId} veiculo={veiculo} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  )
}

function Conteudo({
  clienteId,
  veiculo,
  onFechar,
}: {
  clienteId: number
  veiculo?: Veiculo | null
  onFechar: () => void
}) {
  const [placa, setPlaca] = useState(veiculo ? formatarPlaca(veiculo.placa) : '')
  const [modelo, setModelo] = useState(veiculo?.modelo ?? '')
  const [cor, setCor] = useState(veiculo?.cor ?? '')
  const [tipo, setTipo] = useState<TipoVeiculo>(veiculo?.tipo ?? 'carro')
  const [erro, setErro] = useState<string>()
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!placaValida(placa)) return setErro('Placa inválida — use ABC-1234 ou ABC1D23.')
    setSalvando(true)
    try {
      const db = await getDb()
      const dados = { placa, modelo, cor, tipo }
      if (veiculo) await atualizarVeiculo(db, veiculo.id, dados)
      else await criarVeiculo(db, clienteId, dados)
      invalidarMovimento()
      toast.success(veiculo ? 'Veículo atualizado.' : 'Veículo cadastrado.')
      onFechar()
    } catch (err) {
      toast.error(mensagemErro(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader>
        <DialogTitle>{veiculo ? 'Editar veículo' : 'Novo veículo'}</DialogTitle>
        <DialogDescription>O tipo define a tabela de preço.</DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <Field label="Placa" htmlFor="vf-placa" error={erro}>
          <Input
            id="vf-placa"
            autoFocus
            value={placa}
            aria-invalid={!!erro}
            onChange={(e) => {
              setPlaca(mascararPlaca(e.target.value))
              setErro(undefined)
            }}
            className="font-display text-lg font-bold tracking-[0.15em] uppercase"
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Tipo</span>
          <Segmented
            aria-label="Tipo de veículo"
            value={tipo}
            onChange={setTipo}
            className="w-full [&>button]:flex-auto [&>button]:px-2"
            options={TIPOS_VEICULO.map((t) => ({ value: t.value, label: t.label.split('/')[0] }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Modelo" htmlFor="vf-modelo">
            <Input id="vf-modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
          </Field>
          <Field label="Cor" htmlFor="vf-cor">
            <Input id="vf-cor" value={cor} onChange={(e) => setCor(e.target.value)} />
          </Field>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={salvando}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}
