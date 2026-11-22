import type { ConfigAgenda } from '@/lib/agenda'
import type { Db } from '../types'

export interface Configuracoes {
  setupConcluido: boolean
  empresa: {
    nome: string
    cnpj: string
    telefone: string
    endereco: string
    /** Logo como data URL (PNG/JPG), usada no comprovante. */
    logo: string
  }
  /** Meta de carros atendidos por dia. */
  metaDiaria: number
  fidelidade: { ativo: boolean; lavagens: number }
  /** Dias sem vir para o cliente ser considerado "sumido". */
  diasSumido: number
  mensagens: {
    pronto: string
    sumido: string
    fidelidade: string
    cobranca: string
    agendamento: string
    lembrete: string
  }
  agenda: ConfigAgenda
  impressao: {
    largura: '80' | '58'
    rodape: string
    perguntarAoEntregar: boolean
  }
  backup: {
    ativo: boolean
    pasta: string
    intervaloHoras: number
    manter: number
    ultimo: string | null
  }
}

export const CONFIG_PADRAO: Configuracoes = {
  setupConcluido: false,
  empresa: { nome: 'Brilho Lava-Jato', cnpj: '', telefone: '', endereco: '', logo: '' },
  metaDiaria: 20,
  fidelidade: { ativo: true, lavagens: 10 },
  diasSumido: 30,
  mensagens: {
    pronto:
      'Olá, {nome}! Seu {modelo} placa {placa} já está pronto e brilhando. Total: {total}. Pode vir buscar quando quiser. — {empresa}',
    sumido:
      'Oi, {nome}! Faz tempo que seu {modelo} não passa aqui na {empresa}. Que tal uma lavagem caprichada esta semana?',
    fidelidade:
      'Oi, {nome}! Falta só 1 lavagem para você ganhar uma lavagem grátis na {empresa}. Te esperamos!',
    cobranca: 'Olá, {nome}! Passando para lembrar do valor em aberto de {total} na {empresa}. Obrigado!',
    agendamento:
      'Olá, {nome}! Seu horário na {empresa} está marcado para {data} às {hora} ({servicos}, {placa}). Responda OK para confirmar.',
    lembrete: 'Oi, {nome}! Lembrando do seu horário hoje às {hora} na {empresa}. Até já!',
  },
  agenda: { abre: '08:00', fecha: '18:00', intervaloMin: 30, vagas: 2, diasFechados: [] },
  impressao: { largura: '80', rodape: 'Obrigado pela preferência! Volte sempre.', perguntarAoEntregar: true },
  backup: { ativo: true, pasta: '', intervaloHoras: 4, manter: 30, ultimo: null },
}

type Chave = keyof Configuracoes

function mesclar<T>(padrao: T, valor: unknown): T {
  if (padrao && typeof padrao === 'object' && !Array.isArray(padrao) && valor && typeof valor === 'object') {
    return { ...padrao, ...(valor as object) } as T
  }
  return (valor as T) ?? padrao
}

export async function carregarConfiguracoes(db: Db): Promise<Configuracoes> {
  const rows = await db.select<{ chave: string; valor: string }>('SELECT chave, valor FROM configuracoes')
  const cfg: Configuracoes = structuredClone(CONFIG_PADRAO)
  for (const r of rows) {
    if (!(r.chave in cfg)) continue
    try {
      const k = r.chave as Chave
      ;(cfg as Record<Chave, unknown>)[k] = mesclar(cfg[k], JSON.parse(r.valor))
    } catch {
      // valor corrompido: mantém o padrão
    }
  }
  return cfg
}

export function stmtSalvarConfig<K extends Chave>(chave: K, valor: Configuracoes[K]) {
  return {
    sql: `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
          ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
    params: [chave, JSON.stringify(valor)],
  }
}

export async function salvarConfig<K extends Chave>(db: Db, chave: K, valor: Configuracoes[K]) {
  const s = stmtSalvarConfig(chave, valor)
  await db.execute(s.sql, s.params)
}
