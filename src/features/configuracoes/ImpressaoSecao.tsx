import { Printer } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Segmented } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import type { Configuracoes } from '@/db/repositories/configuracoes'
import type { Comprovante as DadosComprovante } from '@/db/repositories/ordens'
import { agoraIso } from '@/lib/datas'
import { Comprovante } from '@/features/comprovante/Comprovante'
import { gravarConfig, Secao } from './comum'

const EXEMPLO: DadosComprovante = {
  id: 0,
  numero: 1234,
  entrada_em: agoraIso(),
  entregue_em: agoraIso(),
  subtotal: 9000,
  desconto: 900,
  total: 8100,
  cortesia: 0,
  placa: 'ABC1D23',
  modelo: 'Chevrolet Onix',
  cliente_nome: 'Cliente de exemplo',
  funcionario_nome: 'Carlos',
  itens: [{ id: 1, ordem_id: 0, servico_id: 1, nome: 'Completa + cera', preco_unit: 9000, quantidade: 1 }],
  pagamentos: [
    { id: 1, forma: 'pix', valor: 5000, pago_em: agoraIso(), quitado_em: null, quitado_forma: null },
    { id: 2, forma: 'dinheiro', valor: 3100, pago_em: agoraIso(), quitado_em: null, quitado_forma: null },
  ],
}

export function ImpressaoSecao({ cfg }: { cfg: Configuracoes }) {
  const [imp, setImp] = useState(cfg.impressao)
  const [salvando, setSalvando] = useState(false)
  const previa = { ...cfg, impressao: imp }
  return (
    <Secao
      titulo="Impressão do comprovante"
      descricao="Comprovante não fiscal para impressora térmica. Configure a impressora como padrão no Windows."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Largura da bobina</span>
            <Segmented
              aria-label="Largura da bobina"
              value={imp.largura}
              onChange={(largura) => setImp((x) => ({ ...x, largura }))}
              options={[
                { value: '80', label: '80 mm' },
                { value: '58', label: '58 mm' },
              ]}
            />
          </div>
          <Field label="Mensagem de agradecimento" htmlFor="imp-rodape">
            <Input
              id="imp-rodape"
              value={imp.rodape}
              onChange={(e) => setImp((x) => ({ ...x, rodape: e.target.value }))}
            />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={imp.perguntarAoEntregar}
              onCheckedChange={(v) => setImp((x) => ({ ...x, perguntarAoEntregar: v }))}
              aria-label="Imprimir ao entregar"
            />
            Deixar “Imprimir comprovante” marcado ao entregar e cobrar
          </label>
          <div className="flex gap-3">
            <Button
              variant="primary"
              loading={salvando}
              onClick={async () => {
                setSalvando(true)
                await gravarConfig('impressao', imp)
                setSalvando(false)
              }}
            >
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer /> Imprimir teste
            </Button>
          </div>
          <p className="text-muted text-sm">
            Dica: na janela de impressão, escolha a impressora térmica, margens “Nenhuma” e desmarque
            cabeçalhos e rodapés.
          </p>
        </div>
        <div className="bg-surface-2 flex justify-center rounded-[14px] p-5">
          <div className="shadow-pop h-fit">
            <Comprovante dados={EXEMPLO} cfg={previa} />
          </div>
        </div>
      </div>
      {createPortal(
        <div className="print-area hidden print:block">
          <Comprovante dados={EXEMPLO} cfg={previa} />
        </div>,
        document.body,
      )}
    </Secao>
  )
}
