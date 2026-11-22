import { MessageCircle, RotateCcw } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { CONFIG_PADRAO, type Configuracoes } from '@/db/repositories/configuracoes'
import { formatBRL } from '@/lib/money'
import { preencherModelo, VARIAVEIS_AGENDA, VARIAVEIS_MENSAGEM } from '@/lib/whatsapp'
import { gravarConfig, Secao } from './comum'

type Chave = keyof Configuracoes['mensagens']
const MODELOS: { chave: Chave; titulo: string; quando: string }[] = [
  { chave: 'pronto', titulo: 'Carro pronto', quando: 'Botão “Avisar cliente” na coluna Pronto' },
  { chave: 'sumido', titulo: 'Cliente sumido', quando: 'Painel do dia → Clientes sumidos' },
  { chave: 'fidelidade', titulo: 'Quase prêmio', quando: 'Painel do dia → clientes a 1 lavagem do prêmio' },
  { chave: 'cobranca', titulo: 'Cobrança de fiado', quando: 'Ficha do cliente → Fiado em aberto' },
  {
    chave: 'agendamento',
    titulo: 'Confirmação de agendamento',
    quando: 'Agenda → ao agendar (dias seguintes)',
  },
  {
    chave: 'lembrete',
    titulo: 'Lembrete do horário',
    quando: 'Agenda → botão do WhatsApp no dia do horário',
  },
]
const DA_AGENDA: Chave[] = ['agendamento', 'lembrete']

export function WhatsAppSecao({ cfg }: { cfg: Configuracoes }) {
  const [msgs, setMsgs] = useState(cfg.mensagens)
  const [salvando, setSalvando] = useState(false)
  const exemplo = {
    nome: 'Ana',
    modelo: 'Onix',
    placa: 'ABC1D23',
    total: formatBRL(6000),
    empresa: cfg.empresa.nome,
    data: '19/10',
    hora: '09:30',
    servicos: 'Lavagem completa',
  }
  return (
    <Secao
      titulo="Mensagens do WhatsApp"
      descricao="Use as variáveis para personalizar. O WhatsApp abre com a mensagem pronta — é só apertar enviar."
    >
      <div className="flex flex-col gap-5">
        {MODELOS.map((m) => (
          <Modelo
            key={m.chave}
            {...m}
            valor={msgs[m.chave]}
            onChange={(v) => setMsgs((x) => ({ ...x, [m.chave]: v }))}
            previa={preencherModelo(msgs[m.chave], exemplo)}
          />
        ))}
      </div>
      <Button
        variant="primary"
        className="self-start"
        loading={salvando}
        onClick={async () => {
          setSalvando(true)
          await gravarConfig('mensagens', msgs, 'Mensagens salvas.')
          setSalvando(false)
        }}
      >
        Salvar mensagens
      </Button>
    </Secao>
  )
}

function Modelo({
  chave,
  titulo,
  quando,
  valor,
  onChange,
  previa,
}: {
  chave: Chave
  titulo: string
  quando: string
  valor: string
  onChange: (v: string) => void
  previa: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const inserir = (variavel: string) => {
    const el = ref.current
    if (!el) return onChange(valor + variavel)
    const ini = el.selectionStart ?? valor.length
    const fim = el.selectionEnd ?? valor.length
    onChange(valor.slice(0, ini) + variavel + valor.slice(fim))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(ini + variavel.length, ini + variavel.length)
    })
  }
  return (
    <div className="border-border grid grid-cols-1 gap-4 rounded-[14px] border p-4 xl:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <label htmlFor={`msg-${chave}`} className="font-semibold">
              {titulo}
            </label>
            <p className="text-muted text-xs">{quando}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(CONFIG_PADRAO.mensagens[chave])}
            aria-label={`Restaurar mensagem padrão de ${titulo}`}
          >
            <RotateCcw /> Padrão
          </Button>
        </div>
        <Textarea
          id={`msg-${chave}`}
          ref={ref}
          rows={3}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5" aria-label="Inserir variável">
          {[...VARIAVEIS_MENSAGEM, ...(DA_AGENDA.includes(chave) ? VARIAVEIS_AGENDA : [])].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => inserir(v)}
              className="border-border-strong bg-surface-2 text-muted hover:border-primary hover:text-primary h-8 rounded-lg border px-2.5 font-mono text-xs transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <MessageCircle className="size-3.5" /> Prévia
        </span>
        <div className="rounded-[14px] bg-[#0b141a] p-3">
          <p className="max-w-[90%] rounded-lg rounded-tl-none bg-[#005c4b] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-[#e9edef]">
            {previa || <span className="opacity-60">Mensagem vazia</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
