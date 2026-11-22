import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  CalendarDays,
  Database,
  DatabaseBackup,
  FileSpreadsheet,
  Gift,
  MessageCircle,
  Moon,
  Palette,
  Printer,
  Sun,
  Trash2,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { qk, useConfig } from '@/app/queries'
import { Button } from '@/components/ui/button'
import { confirmar } from '@/components/ui/confirm'
import { Segmented, Skeleton } from '@/components/ui/misc'
import { getDb } from '@/db'
import { carregarDemo, removerDemo, temDadosDemo } from '@/db/seed'
import { mensagemErro } from '@/lib/erros'
import { cn } from '@/lib/utils'
import { useEhDono } from '@/stores/sessao'
import { useUi } from '@/stores/ui'
import { AgendaSecao } from './AgendaSecao'
import { BackupSecao } from './BackupSecao'
import { Secao } from './comum'
import { EmpresaSecao } from './EmpresaSecao'
import { ImportarSecao } from './ImportarSecao'
import { ImpressaoSecao } from './ImpressaoSecao'
import { RegrasCard } from './RegrasCard'
import { UsuariosSecao } from './UsuariosSecao'
import { WhatsAppSecao } from './WhatsAppSecao'

const ABAS = [
  { id: 'empresa', titulo: 'Empresa', icon: Building2, dono: true },
  { id: 'usuarios', titulo: 'Usuários e PINs', icon: Users, dono: true },
  { id: 'fidelidade', titulo: 'Fidelidade e metas', icon: Gift, dono: true },
  { id: 'agenda', titulo: 'Agenda', icon: CalendarDays, dono: true },
  { id: 'whatsapp', titulo: 'WhatsApp', icon: MessageCircle, dono: true },
  { id: 'impressao', titulo: 'Impressão', icon: Printer, dono: true },
  { id: 'backup', titulo: 'Backup', icon: DatabaseBackup, dono: true },
  { id: 'importar', titulo: 'Importar planilha', icon: FileSpreadsheet, dono: true },
  { id: 'aparencia', titulo: 'Aparência', icon: Palette, dono: false },
  { id: 'demo', titulo: 'Demonstração', icon: Database, dono: true },
] as const
type Aba = (typeof ABAS)[number]['id']

export default function ConfiguracoesPage() {
  const ehDono = useEhDono()
  const { data: cfg } = useConfig()
  const [params, setParams] = useSearchParams()
  const abas = ABAS.filter((a) => ehDono || !a.dono)
  const pedida = params.get('aba') as Aba | null
  const aba: Aba = abas.some((a) => a.id === pedida) ? pedida! : abas[0]!.id

  return (
    <div className="grid grid-cols-[220px_minmax(0,1fr)] items-start gap-6">
      <nav aria-label="Seções das configurações" className="sticky top-0 flex flex-col gap-1">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-current={aba === a.id ? 'page' : undefined}
            onClick={() => setParams({ aba: a.id }, { replace: true })}
            className={cn(
              'flex h-11 items-center gap-3 rounded-[var(--radius-btn)] px-3 text-left text-[15px] font-medium transition-colors duration-150',
              aba === a.id ? 'bg-surface-2 text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
            )}
          >
            <a.icon className="size-[18px]" />
            {a.titulo}
          </button>
        ))}
      </nav>
      <div key={aba} className="animate-fade-in max-w-5xl">
        {!cfg ? (
          <Skeleton className="h-80 w-full rounded-[var(--radius-card)]" />
        ) : aba === 'empresa' ? (
          <EmpresaSecao cfg={cfg} />
        ) : aba === 'usuarios' ? (
          <UsuariosSecao />
        ) : aba === 'fidelidade' ? (
          <RegrasCard cfg={cfg} />
        ) : aba === 'agenda' ? (
          <AgendaSecao cfg={cfg} />
        ) : aba === 'whatsapp' ? (
          <WhatsAppSecao cfg={cfg} />
        ) : aba === 'impressao' ? (
          <ImpressaoSecao cfg={cfg} />
        ) : aba === 'backup' ? (
          <BackupSecao cfg={cfg} />
        ) : aba === 'importar' ? (
          <ImportarSecao />
        ) : aba === 'demo' ? (
          <DadosDemo />
        ) : (
          <Aparencia />
        )}
      </div>
    </div>
  )
}

function Aparencia() {
  const prefs = useUi((s) => s.prefs)
  const setPrefs = useUi((s) => s.setPrefs)
  return (
    <Secao titulo="Aparência" descricao="Vale só para este computador.">
      <div className="flex flex-wrap gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Tema</span>
          <Segmented
            aria-label="Tema"
            value={prefs.tema}
            onChange={(tema) => setPrefs({ tema })}
            options={[
              {
                value: 'escuro',
                label: (
                  <span className="flex items-center gap-2">
                    <Moon className="size-4" /> Escuro
                  </span>
                ),
              },
              {
                value: 'claro',
                label: (
                  <span className="flex items-center gap-2">
                    <Sun className="size-4" /> Claro
                  </span>
                ),
              },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Tamanho da fonte</span>
          <Segmented
            aria-label="Tamanho da fonte"
            value={prefs.fonte}
            onChange={(fonte) => setPrefs({ fonte })}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'grande', label: 'Grande' },
              { value: 'maior', label: 'Maior' },
            ]}
          />
        </div>
      </div>
    </Secao>
  )
}

function DadosDemo() {
  const qc = useQueryClient()
  const { data: tem } = useQuery({ queryKey: qk.demo, queryFn: async () => temDadosDemo(await getDb()) })
  const [ocupado, setOcupado] = useState(false)

  const executar = async (acao: 'carregar' | 'remover') => {
    if (
      acao === 'remover' &&
      !(await confirmar({
        titulo: 'Remover dados de demonstração?',
        descricao:
          'Clientes, ordens, caixas e despesas fictícios serão apagados. Seus dados reais continuam.',
        confirmar: 'Remover',
        perigoso: true,
      }))
    )
      return
    setOcupado(true)
    try {
      const db = await getDb()
      if (acao === 'carregar') await carregarDemo(db)
      else await removerDemo(db)
      await qc.invalidateQueries()
      toast.success(
        acao === 'carregar' ? 'Dados de demonstração carregados.' : 'Dados de demonstração removidos.',
      )
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Secao
      titulo="Dados de demonstração"
      descricao="15 clientes fictícios, 30 dias de histórico e uma fila em andamento — ótimo para conhecer o sistema. Remover apaga só o que é fictício."
    >
      <div>
        {tem ? (
          <Button variant="danger-soft" onClick={() => executar('remover')} loading={ocupado}>
            <Trash2 /> Remover dados de demonstração
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => executar('carregar')} loading={ocupado}>
            <Database /> Carregar dados de demonstração
          </Button>
        )}
      </div>
    </Secao>
  )
}
