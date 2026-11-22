import type { TipoVeiculo } from './ordem'
import { normalizarPlaca, placaValida } from './placa'
import { normalizarTelefone, telefoneValido } from './telefone'

export type CampoImportacao =
  'nome' | 'telefone' | 'placa' | 'modelo' | 'cor' | 'tipo' | 'observacoes' | 'aniversario'

export const CAMPOS: { campo: CampoImportacao; rotulo: string; obrigatorio?: boolean }[] = [
  { campo: 'nome', rotulo: 'Nome do cliente', obrigatorio: true },
  { campo: 'telefone', rotulo: 'Telefone / WhatsApp' },
  { campo: 'placa', rotulo: 'Placa', obrigatorio: true },
  { campo: 'modelo', rotulo: 'Modelo do veículo' },
  { campo: 'cor', rotulo: 'Cor' },
  { campo: 'tipo', rotulo: 'Tipo (carro, moto…)' },
  { campo: 'observacoes', rotulo: 'Observações' },
  { campo: 'aniversario', rotulo: 'Aniversário' },
]

const SINONIMOS: Record<CampoImportacao, string[]> = {
  nome: ['nome', 'cliente', 'nome do cliente', 'proprietario', 'dono'],
  telefone: ['telefone', 'fone', 'celular', 'whatsapp', 'whats', 'contato', 'tel'],
  placa: ['placa', 'placas'],
  modelo: ['modelo', 'carro', 'veiculo', 'automovel', 'marca/modelo', 'marca e modelo'],
  cor: ['cor'],
  tipo: ['tipo', 'categoria', 'porte'],
  observacoes: ['observacoes', 'observacao', 'obs', 'anotacoes', 'notas'],
  aniversario: ['aniversario', 'nascimento', 'data de nascimento', 'niver'],
}

export const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export type Mapeamento = Partial<Record<CampoImportacao, number>>

/** Sugere qual coluna da planilha vai para cada campo, pelo nome do cabeçalho. */
export function sugerirMapeamento(cabecalho: string[]): Mapeamento {
  const m: Mapeamento = {}
  const usados = new Set<number>()
  const h = cabecalho.map((c) => semAcento(String(c ?? '')))
  for (const { campo } of CAMPOS) {
    // primeiro igualdade exata, depois "contém"
    let idx = h.findIndex((c, i) => !usados.has(i) && SINONIMOS[campo].includes(c))
    if (idx < 0) idx = h.findIndex((c, i) => !usados.has(i) && SINONIMOS[campo].some((s) => c.includes(s)))
    if (idx >= 0) {
      m[campo] = idx
      usados.add(idx)
    }
  }
  return m
}

export function interpretarTipo(v: string): TipoVeiculo {
  const t = semAcento(v)
  if (/moto/.test(t)) return 'moto'
  if (/van|kombi|furg/.test(t)) return 'van'
  if (/camin|pick|suv|picape/.test(t)) return 'caminhonete'
  return 'carro'
}

/** Aceita "14/03", "14/03/1985", "1985-03-14" ou número de data do Excel → "03-14". */
export function interpretarAniversario(v: unknown): string | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && v > 59) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-]\d{2,4})?$/)
  if (m) return valido(Number(m[2]), Number(m[1]))
  m = s.match(/^\d{4}-(\d{2})-(\d{2})/)
  if (m) return valido(Number(m[1]), Number(m[2]))
  return null
}
function valido(mes: number, dia: number) {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  return `${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export interface LinhaImportada {
  linha: number
  nome: string
  telefone: string
  placa: string
  modelo: string
  cor: string
  tipo: TipoVeiculo
  observacoes: string
  aniversario: string | null
}

export interface ErroImportacao {
  linha: number
  motivo: string
  conteudo: string
}

export interface ClienteImportacao {
  nome: string
  telefone: string
  observacoes: string
  aniversario: string | null
  veiculos: { placa: string; modelo: string; cor: string; tipo: TipoVeiculo; linha: number }[]
}

export interface PlanoImportacao {
  clientes: ClienteImportacao[]
  erros: ErroImportacao[]
  totalLinhas: number
}

const texto = (row: unknown[], idx: number | undefined) =>
  idx === undefined ? '' : String(row[idx] ?? '').trim()

/**
 * Valida as linhas e agrupa por cliente (mesmo nome + telefone vira um cliente com vários veículos).
 * Placas inválidas, repetidas na planilha ou já cadastradas viram erros, sem travar o resto.
 * @param linhas linhas de dados (sem o cabeçalho); `primeiraLinha` é o número da 1ª na planilha
 */
export function planejarImportacao(
  linhas: unknown[][],
  mapa: Mapeamento,
  placasExistentes: Set<string>,
  primeiraLinha = 2,
): PlanoImportacao {
  const erros: ErroImportacao[] = []
  const vistas = new Set<string>()
  const porChave = new Map<string, ClienteImportacao>()
  let total = 0
  linhas.forEach((row, i) => {
    const linha = primeiraLinha + i
    if (!row || row.every((c) => String(c ?? '').trim() === '')) return
    total++
    const conteudo = row.map((c) => String(c ?? '')).join(' · ')
    const nome = texto(row, mapa.nome).replace(/\s+/g, ' ')
    const placaBruta = texto(row, mapa.placa)
    const placa = normalizarPlaca(placaBruta)
    const telBruto = texto(row, mapa.telefone)
    const telefone = normalizarTelefone(telBruto)

    if (nome.length < 2) return erros.push({ linha, motivo: 'Nome do cliente vazio', conteudo })
    if (!placaBruta) return erros.push({ linha, motivo: 'Placa vazia', conteudo })
    if (!placaValida(placa)) return erros.push({ linha, motivo: `Placa inválida (${placaBruta})`, conteudo })
    if (vistas.has(placa))
      return erros.push({ linha, motivo: `Placa ${placa} repetida na planilha`, conteudo })
    if (placasExistentes.has(placa))
      return erros.push({ linha, motivo: `Placa ${placa} já cadastrada`, conteudo })
    if (telBruto && !telefoneValido(telefone))
      return erros.push({ linha, motivo: `Telefone inválido (${telBruto})`, conteudo })
    vistas.add(placa)

    const chave = `${semAcento(nome)}|${telefone}`
    let cli = porChave.get(chave)
    if (!cli) {
      cli = {
        nome,
        telefone,
        observacoes: texto(row, mapa.observacoes),
        aniversario: mapa.aniversario === undefined ? null : interpretarAniversario(row[mapa.aniversario]),
        veiculos: [],
      }
      porChave.set(chave, cli)
    }
    cli.veiculos.push({
      placa,
      modelo: texto(row, mapa.modelo),
      cor: texto(row, mapa.cor),
      // Sem coluna de tipo, tenta pelo modelo ("Moto Honda Biz" → moto)
      tipo: interpretarTipo(texto(row, mapa.tipo) || texto(row, mapa.modelo)),
      linha,
    })
  })
  return { clientes: [...porChave.values()], erros, totalLinhas: total }
}
