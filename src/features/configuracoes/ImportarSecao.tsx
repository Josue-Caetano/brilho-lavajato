import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Download,
  FileSpreadsheet,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { read, utils, write } from 'xlsx'
import { invalidarMovimento } from '@/app/queries'
import { PlateChip } from '@/components/PlateChip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { getDb } from '@/db'
import { importarClientes, placasCadastradas } from '@/db/repositories/clientes'
import { abrirArquivo, salvarArquivo } from '@/lib/arquivos'
import { mensagemErro } from '@/lib/erros'
import {
  CAMPOS,
  planejarImportacao,
  sugerirMapeamento,
  type CampoImportacao,
  type ErroImportacao,
  type Mapeamento,
  type PlanoImportacao,
} from '@/lib/importacao'
import { formatarTelefone } from '@/lib/telefone'
import { cn } from '@/lib/utils'
import { Secao } from './comum'

interface Planilha {
  nome: string
  abas: string[]
  aba: string
  linhas: unknown[][]
  bytes: Uint8Array
}

const NENHUMA = '-1'

function lerAba(bytes: Uint8Array, aba?: string) {
  const wb = read(bytes, { type: 'array', cellDates: false })
  const nome = aba ?? wb.SheetNames[0]!
  const linhas = utils.sheet_to_json<unknown[]>(wb.Sheets[nome]!, { header: 1, raw: true, defval: '' })
  return { abas: wb.SheetNames, aba: nome, linhas }
}

/** Assistente em 3 passos: escolher arquivo → mapear colunas com prévia → importar com relatório. */
export function ImportarSecao() {
  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const [planilha, setPlanilha] = useState<Planilha | null>(null)
  const [mapa, setMapa] = useState<Mapeamento>({})
  const [plano, setPlano] = useState<PlanoImportacao | null>(null)
  const [resultado, setResultado] = useState<{ clientes: number; veiculos: number } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const cabecalho = (planilha?.linhas[0] ?? []).map((c) => String(c ?? ''))
  const dados = planilha?.linhas.slice(1) ?? []

  const escolher = async () => {
    try {
      const arq = await abrirArquivo({ name: 'Planilha', extensions: ['xlsx', 'xls', 'csv', 'ods'] })
      if (!arq) return
      const { abas, aba, linhas } = lerAba(arq.bytes)
      if (linhas.length < 2) return toast.error('A planilha está vazia ou só tem o cabeçalho.')
      setPlanilha({ nome: arq.nome, abas, aba, linhas, bytes: arq.bytes })
      setMapa(sugerirMapeamento((linhas[0] ?? []).map((c) => String(c ?? ''))))
      setResultado(null)
      setPasso(2)
    } catch (e) {
      toast.error(`Não foi possível ler a planilha. ${mensagemErro(e)}`)
    }
  }

  const trocarAba = (aba: string) => {
    if (!planilha) return
    const r = lerAba(planilha.bytes, aba)
    setPlanilha({ ...planilha, aba, linhas: r.linhas })
    setMapa(sugerirMapeamento((r.linhas[0] ?? []).map((c) => String(c ?? ''))))
  }

  const preparar = async () => {
    const existentes = await placasCadastradas(await getDb())
    setPlano(planejarImportacao(dados, mapa, existentes))
    setPasso(3)
  }

  const importar = async () => {
    if (!plano) return
    setOcupado(true)
    try {
      const r = await importarClientes(await getDb(), plano.clientes)
      invalidarMovimento()
      setResultado(r)
      toast.success(`${r.clientes} clientes e ${r.veiculos} veículos importados.`)
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setOcupado(false)
    }
  }

  const baixarErros = async (erros: ErroImportacao[]) => {
    const ws = utils.json_to_sheet(
      erros.map((e) => ({ Linha: e.linha, Motivo: e.motivo, Conteúdo: e.conteudo })),
    )
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Erros')
    await salvarArquivo(
      'erros-importacao.xlsx',
      write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array,
      {
        name: 'Planilha do Excel',
        extensions: ['xlsx'],
      },
    )
  }

  const obrigatoriosOk = CAMPOS.filter((c) => c.obrigatorio).every((c) => mapa[c.campo] !== undefined)
  const valor = (row: unknown[], campo: CampoImportacao) =>
    mapa[campo] === undefined ? '' : String(row[mapa[campo]!] ?? '')

  return (
    <Secao
      titulo="Importar planilha"
      descricao="Traga seus clientes e carros da planilha antiga (.xlsx ou .csv). Uma linha por veículo; o mesmo cliente pode aparecer em várias linhas."
    >
      <ol className="flex gap-2 text-sm" aria-label="Etapas">
        {['Escolher arquivo', 'Mapear colunas', 'Importar'].map((t, i) => (
          <li
            key={t}
            aria-current={passo === i + 1 ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5',
              passo === i + 1
                ? 'border-primary bg-primary-tint text-primary'
                : passo > i + 1
                  ? 'border-border text-text'
                  : 'border-border text-muted',
            )}
          >
            <span className="font-display font-bold">{i + 1}</span> {t}
          </li>
        ))}
      </ol>

      {passo === 1 && (
        <button
          type="button"
          onClick={escolher}
          className="border-border-strong hover:border-primary hover:bg-primary-tint flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed px-6 py-12 text-center transition-colors"
        >
          <span className="bg-primary-tint text-primary flex size-14 items-center justify-center rounded-2xl">
            <Upload className="size-7" />
          </span>
          <span className="font-display text-lg font-semibold">Escolher planilha</span>
          <span className="text-muted max-w-md text-sm">
            A primeira linha deve ter os nomes das colunas (ex.: Cliente, Telefone, Placa, Modelo, Cor). Na
            próxima etapa você confere tudo antes de importar.
          </span>
        </button>
      )}

      {passo === 2 && planilha && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <FileSpreadsheet className="text-success size-5" />
            <strong>{planilha.nome}</strong>
            <span className="text-muted">{dados.length} linhas</span>
            {planilha.abas.length > 1 && (
              <div className="ml-auto w-56">
                <Select
                  aria-label="Aba da planilha"
                  value={planilha.aba}
                  onValueChange={trocarAba}
                  options={planilha.abas.map((a) => ({ value: a, label: `Aba: ${a}` }))}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 xl:grid-cols-4">
            {CAMPOS.map((c) => (
              <div key={c.campo} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor={`map-${c.campo}`}>
                  {c.rotulo}
                  {c.obrigatorio && <span className="text-danger"> *</span>}
                </label>
                <Select
                  id={`map-${c.campo}`}
                  value={String(mapa[c.campo] ?? NENHUMA)}
                  onValueChange={(v) =>
                    setMapa((m) => {
                      const novo = { ...m }
                      if (v === NENHUMA) delete novo[c.campo]
                      else novo[c.campo] = Number(v)
                      return novo
                    })
                  }
                  options={[
                    { value: NENHUMA, label: '— não importar —' },
                    ...cabecalho.map((h, i) => ({ value: String(i), label: h || `Coluna ${i + 1}` })),
                  ]}
                />
              </div>
            ))}
          </div>
          <div className="border-border overflow-hidden rounded-[14px] border">
            <p className="border-border bg-surface-2 text-muted border-b px-4 py-2 text-xs font-semibold tracking-wide uppercase">
              Prévia das primeiras linhas
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-left text-xs">
                  {CAMPOS.filter((c) => mapa[c.campo] !== undefined).map((c) => (
                    <th key={c.campo} className="px-4 py-2 font-semibold">
                      {c.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-border border-t">
                    {CAMPOS.filter((c) => mapa[c.campo] !== undefined).map((c) => (
                      <td key={c.campo} className="px-4 py-2">
                        {valor(row, c.campo)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setPasso(1)}>
              <ArrowLeft /> Outro arquivo
            </Button>
            <Button variant="primary" disabled={!obrigatoriosOk} onClick={preparar}>
              Conferir e continuar <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      {passo === 3 && plano && (
        <div className="flex flex-col gap-5">
          {resultado ? (
            <div className="border-success/40 bg-success-tint flex items-center gap-4 rounded-[14px] border p-5">
              <CircleCheck className="text-success size-8" />
              <div>
                <p className="font-display text-lg font-semibold">Importação concluída</p>
                <p className="text-muted text-sm">
                  {resultado.clientes} clientes e {resultado.veiculos} veículos cadastrados.
                  {plano.erros.length > 0 && ` ${plano.erros.length} linhas ficaram de fora (veja abaixo).`}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Resumo rotulo="Clientes a importar" valor={plano.clientes.length} />
              <Resumo
                rotulo="Veículos a importar"
                valor={plano.clientes.reduce((a, c) => a + c.veiculos.length, 0)}
              />
              <Resumo
                rotulo="Linhas com problema"
                valor={plano.erros.length}
                alerta={plano.erros.length > 0}
              />
            </div>
          )}

          {!resultado && plano.clientes.length > 0 && (
            <div className="border-border max-h-64 overflow-auto rounded-[14px] border">
              <table className="w-full text-sm">
                <tbody>
                  {plano.clientes.slice(0, 100).map((c, i) => (
                    <tr key={i} className="border-border border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{c.nome}</td>
                      <td className="text-muted px-4 py-2">{formatarTelefone(c.telefone) || '—'}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {c.veiculos.map((v) => (
                            <PlateChip key={v.placa} placa={v.placa} size="sm" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {plano.erros.length > 0 && (
            <div className="border-warning/30 flex flex-col gap-2 rounded-[14px] border p-4">
              <div className="flex items-center justify-between">
                <p className="text-warning flex items-center gap-2 font-semibold">
                  <TriangleAlert className="size-4" /> {plano.erros.length} linhas não serão importadas
                </p>
                <Button variant="ghost" size="sm" onClick={() => baixarErros(plano.erros)}>
                  <Download /> Baixar relatório de erros
                </Button>
              </div>
              <ul className="max-h-48 overflow-auto text-sm">
                {plano.erros.map((e) => (
                  <li key={e.linha} className="border-border flex gap-3 border-b py-1.5 last:border-0">
                    <Badge tone="warning">Linha {e.linha}</Badge>
                    <span>{e.motivo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between">
            {resultado ? (
              <Button variant="secondary" onClick={() => setPasso(1)}>
                Importar outra planilha
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setPasso(2)} disabled={ocupado}>
                  <ArrowLeft /> Voltar ao mapeamento
                </Button>
                <Button
                  variant="primary"
                  onClick={importar}
                  loading={ocupado}
                  disabled={plano.clientes.length === 0}
                >
                  Importar {plano.clientes.length} clientes
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Secao>
  )
}

function Resumo({ rotulo, valor, alerta }: { rotulo: string; valor: number; alerta?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[14px] border p-4',
        alerta ? 'border-warning/30 bg-warning-tint' : 'border-border bg-surface-2',
      )}
    >
      <p className="text-muted text-sm">{rotulo}</p>
      <p className={cn('font-display text-3xl font-bold', alerta && 'text-warning')}>{valor}</p>
    </div>
  )
}
