import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import type { Configuracoes } from '@/db/repositories/configuracoes'
import { formatarTelefone } from '@/lib/telefone'
import { gravarConfig, Secao } from './comum'

/** Reduz a imagem para no máximo 320 px (o comprovante é estreito) e devolve como data URL PNG. */
async function reduzirImagem(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => erro(new Error('Imagem inválida.'))
      i.src = url
    })
    const escala = Math.min(1, 320 / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * escala)
    canvas.height = Math.round(img.height * escala)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function EmpresaSecao({ cfg }: { cfg: Configuracoes }) {
  const [e, setE] = useState(cfg.empresa)
  const [salvando, setSalvando] = useState(false)
  const inputLogo = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<typeof e>) => setE((x) => ({ ...x, ...patch }))
  const valido = e.nome.trim().length >= 2

  return (
    <Secao
      titulo="Dados da empresa"
      descricao="Aparecem no comprovante e nas mensagens do WhatsApp ({empresa})."
    >
      <div className="grid grid-cols-[1fr_auto] gap-6">
        <div className="flex flex-col gap-4">
          <Field label="Nome do lava-jato" htmlFor="emp-nome" error={valido ? undefined : 'Informe o nome'}>
            <Input id="emp-nome" value={e.nome} onChange={(ev) => set({ nome: ev.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="CNPJ" htmlFor="emp-cnpj">
              <Input
                id="emp-cnpj"
                value={e.cnpj}
                onChange={(ev) => set({ cnpj: ev.target.value })}
                placeholder="00.000.000/0001-00"
              />
            </Field>
            <Field label="Telefone" htmlFor="emp-tel">
              <Input
                id="emp-tel"
                value={formatarTelefone(e.telefone)}
                onChange={(ev) => set({ telefone: ev.target.value })}
              />
            </Field>
          </div>
          <Field label="Endereço" htmlFor="emp-end">
            <Input id="emp-end" value={e.endereco} onChange={(ev) => set({ endereco: ev.target.value })} />
          </Field>
        </div>
        <div className="flex w-48 flex-col gap-2">
          <span className="text-sm font-medium">Logo</span>
          <div className="border-border-strong flex aspect-square items-center justify-center overflow-hidden rounded-[14px] border border-dashed bg-white p-3">
            {e.logo ? (
              <img src={e.logo} alt="Logo da empresa" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-center text-xs text-slate-500">Sem logo</span>
            )}
          </div>
          <input
            ref={inputLogo}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={async (ev) => {
              const f = ev.target.files?.[0]
              ev.target.value = ''
              if (!f) return
              try {
                set({ logo: await reduzirImagem(f) })
              } catch {
                toast.error('Não foi possível abrir essa imagem.')
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => inputLogo.current?.click()}
            >
              <ImagePlus /> Escolher
            </Button>
            {e.logo && (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Remover logo"
                onClick={() => set({ logo: '' })}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="primary"
        className="self-start"
        disabled={!valido}
        loading={salvando}
        onClick={async () => {
          setSalvando(true)
          await gravarConfig('empresa', { ...e, nome: e.nome.trim() })
          setSalvando(false)
        }}
      >
        Salvar dados da empresa
      </Button>
    </Secao>
  )
}
