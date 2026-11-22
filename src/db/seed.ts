import { addDays, addMinutes, setHours, setMinutes, startOfDay, subDays } from 'date-fns'
import { toIsoLocal } from '@/lib/datas'
import { hashPin } from '@/lib/pin'
import { calcularTotais, precoPorTipo, type FormaPagamento, type TipoVeiculo } from '@/lib/ordem'
import { listarServicos, SERVICOS_PADRAO, stmtCriarServico, type Servico } from './repositories/servicos'
import { carregarConfiguracoes } from './repositories/configuracoes'
import { ref, type Db, type Stmt } from './types'

/*
 * Dados de demonstração: ~15 clientes, 30 dias de histórico, caixas fechados, despesas
 * e uma fila em andamento hoje. Tudo marcado com demo = 1 e removível com um clique.
 */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = () => number
const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!
const between = (rng: Rng, min: number, max: number) => Math.floor(min + rng() * (max - min + 1))
function weighted<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((a, [, w]) => a + w, 0)
  let r = rng() * total
  for (const [v, w] of items) {
    r -= w
    if (r <= 0) return v
  }
  return items[items.length - 1]![0]
}

const CLIENTES: { nome: string; tel: string; obs?: string; aniversario?: string }[] = [
  { nome: 'Ana Paula Ribeiro', tel: '11987452310', aniversario: '03-14' },
  { nome: 'Marcos Vinícius Souza', tel: '11991238874', obs: 'Não usar pretinho no pneu' },
  { nome: 'Juliana Ferreira', tel: '11976541122' },
  { nome: 'Roberto Almeida', tel: '11988127766', obs: 'Prefere pagar no Pix' },
  { nome: 'Fernanda Costa', tel: '11999887755' },
  { nome: 'Carlos Eduardo Lima', tel: '11984561203', obs: 'Cliente da frota da padaria' },
  { nome: 'Patrícia Gomes', tel: '11972345588' },
  { nome: 'Rafael Martins', tel: '11995671234' },
  { nome: 'Luciana Barbosa', tel: '11981112299', obs: 'Cuidado com o adesivo do vidro traseiro' },
  { nome: 'Thiago Oliveira', tel: '11993348812' },
  { nome: 'Camila Rocha', tel: '11978903344' },
  { nome: 'José Carlos Pereira', tel: '11986654477', obs: 'Sempre pede cera' },
  { nome: 'Beatriz Santos', tel: '11974449900' },
  { nome: 'Diego Fernandes', tel: '11992227788' },
  { nome: 'Sônia Mendes', tel: '11989990011' },
]

const VEICULOS: { modelo: string; tipo: TipoVeiculo }[] = [
  { modelo: 'Chevrolet Onix', tipo: 'carro' },
  { modelo: 'Hyundai HB20', tipo: 'carro' },
  { modelo: 'VW Gol', tipo: 'carro' },
  { modelo: 'Toyota Corolla', tipo: 'carro' },
  { modelo: 'Toyota Hilux', tipo: 'caminhonete' },
  { modelo: 'Jeep Compass', tipo: 'caminhonete' },
  { modelo: 'Fiat Strada', tipo: 'carro' },
  { modelo: 'Renault Kwid', tipo: 'carro' },
  { modelo: 'Honda Civic', tipo: 'carro' },
  { modelo: 'VW T-Cross', tipo: 'caminhonete' },
  { modelo: 'Honda CG 160', tipo: 'moto' },
  { modelo: 'Fiat Toro', tipo: 'caminhonete' },
  { modelo: 'Renault Master', tipo: 'van' },
  { modelo: 'Fiat Argo', tipo: 'carro' },
  { modelo: 'Yamaha Fazer 250', tipo: 'moto' },
  { modelo: 'Nissan Kicks', tipo: 'caminhonete' },
  { modelo: 'Fiat Mobi', tipo: 'carro' },
  { modelo: 'VW Polo', tipo: 'carro' },
]
const CORES = ['Prata', 'Preto', 'Branco', 'Cinza', 'Vermelho', 'Azul', 'Branco', 'Prata']

function gerarPlaca(rng: Rng, usadas: Set<string>): string {
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (;;) {
    const letras = Array.from({ length: 3 }, () => pick(rng, [...L])).join('')
    const placa =
      rng() < 0.6
        ? `${letras}${between(rng, 0, 9)}${pick(rng, [...L.slice(0, 10)])}${between(rng, 10, 99)}`
        : `${letras}${between(rng, 1000, 9999)}`
    if (!usadas.has(placa)) {
      usadas.add(placa)
      return placa
    }
  }
}

const FORMAS: (readonly [FormaPagamento, number])[] = [
  ['pix', 45],
  ['dinheiro', 24],
  ['debito', 15],
  ['credito', 12],
  ['fiado', 4],
]

/** Quantos carros num dia, conforme o dia da semana (domingo = 0). */
const MOVIMENTO_DIA: [number, number][] = [
  [4, 7],
  [6, 9],
  [7, 11],
  [7, 11],
  [8, 12],
  [10, 15],
  [14, 20],
]

export async function temDadosDemo(db: Db): Promise<boolean> {
  const [r] = await db.select<{ n: number }>('SELECT COUNT(*) AS n FROM clientes WHERE demo = 1')
  return Number(r?.n ?? 0) > 0
}

export async function carregarDemo(db: Db, agora: Date = new Date(), semente = 20261018): Promise<void> {
  if (await temDadosDemo(db)) return
  const rng = mulberry32(semente)
  const stmts: Stmt[] = []
  const push = (s: Stmt) => stmts.push(s) - 1

  // Serviços: usa os cadastrados; se não houver, cria os padrões.
  let servicos: Servico[] = await listarServicos(db, true)
  if (servicos.length === 0) {
    await db.transaction(SERVICOS_PADRAO.map((s, i) => stmtCriarServico(s, i + 1)))
    servicos = await listarServicos(db, true)
  }
  const cfg = await carregarConfiguracoes(db)
  const metaFid = Math.max(1, cfg.fidelidade.lavagens)
  const porNome = (trecho: string) => servicos.find((s) => s.nome.toLowerCase().includes(trecho))
  const pesoServico = (s: Servico) => {
    const n = s.nome.toLowerCase()
    if (n.includes('simples')) return 40
    if (n.includes('cera')) return 16
    if (n.includes('completa')) return 30
    if (n.includes('higien')) return 5
    if (n.includes('polim')) return 3
    return 6
  }
  const servicosPeso = servicos.map((s) => [s, pesoServico(s)] as const)
  const extra = porNome('higien')

  // Funcionários de demonstração (PIN 1111 e 2222) + o dono já cadastrado.
  const ini = toIsoLocal(subDays(agora, 40))
  const funcs: (number | ReturnType<typeof ref>)[] = []
  for (const [nome, pin] of [
    ['Carlos (demo)', '1111'],
    ['Bruno (demo)', '2222'],
  ] as const) {
    funcs.push(
      ref(
        push({
          sql: "INSERT INTO usuarios (nome, pin_hash, papel, ativo, criado_em, demo) VALUES (?, ?, 'funcionario', 1, ?, 1)",
          params: [nome, await hashPin(pin), ini],
        }),
      ),
    )
  }
  const [dono] = await db.select<{ id: number }>(
    "SELECT id FROM usuarios WHERE papel = 'dono' ORDER BY id LIMIT 1",
  )
  if (dono) funcs.push(dono.id)

  // Clientes e veículos
  const placas = new Set<string>()
  const frota: {
    veiculoRef: number
    clienteRef: number
    clienteIdx: number
    tipo: TipoVeiculo
    peso: number
  }[] = []
  CLIENTES.forEach((c, idx) => {
    const ci = push({
      sql: 'INSERT INTO clientes (nome, telefone, observacoes, aniversario, criado_em, demo) VALUES (?, ?, ?, ?, ?, 1)',
      params: [c.nome, c.tel, c.obs ?? null, c.aniversario ?? null, ini],
    })
    const qtd = idx === 5 ? 3 : rng() < 0.2 ? 2 : 1
    for (let k = 0; k < qtd; k++) {
      const v = pick(rng, VEICULOS)
      const vi = push({
        sql: 'INSERT INTO veiculos (cliente_id, placa, modelo, cor, tipo, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
        params: [ref(ci), gerarPlaca(rng, placas), v.modelo, pick(rng, CORES), v.tipo, ini],
      })
      // Alguns clientes vêm toda semana; os três últimos sumiram (só aparecem há mais de 30 dias).
      const peso = idx >= 12 ? 0 : idx < 4 ? 5 : idx < 8 ? 3 : 1.4
      frota.push({ veiculoRef: vi, clienteRef: ci, clienteIdx: idx, tipo: v.tipo, peso })
    }
  })

  const fid = new Map<number, { pagas: number; cortesias: number }>()
  const fidDe = (i: number) => fid.get(i) ?? (fid.set(i, { pagas: 0, cortesias: 0 }), fid.get(i)!)

  interface NovaOrdem {
    carro: (typeof frota)[number]
    entrada: Date
    status: 'aguardando' | 'lavando' | 'acabamento' | 'pronto' | 'entregue'
    caixaRef: number | null
    agoraRef: Date
  }

  /** Cria uma ordem com itens e pagamentos. Retorna o dinheiro líquido recebido (para o caixa). */
  const criarOrdem = ({ carro, entrada, status, caixaRef, agoraRef }: NovaOrdem) => {
    const possiveis = servicosPeso.filter(([s]) => precoPorTipo(s, carro.tipo) > 0)
    const principal = weighted(rng, possiveis.length ? possiveis : servicosPeso)
    const itens = [principal]
    if (extra && principal !== extra && carro.tipo !== 'moto' && rng() < 0.06) itens.push(extra)
    const linhas = itens
      .map((s) => ({ s, preco_unit: precoPorTipo(s, carro.tipo), quantidade: 1 }))
      .filter((l) => l.preco_unit > 0)
    if (linhas.length === 0) return { dinheiro: 0, fiado: false }
    const duracao = Math.max(...linhas.map((l) => l.s.duracao_min))

    const f = fidDe(carro.clienteIdx)
    const cortesia = status === 'entregue' && f.pagas - metaFid * f.cortesias >= metaFid
    const desconto = !cortesia && rng() < 0.07 ? ({ tipo: 'percentual', valor: 10 } as const) : null
    const tot = calcularTotais(linhas, desconto, cortesia)

    const inicio = addMinutes(entrada, between(rng, 3, 25))
    const acab = addMinutes(inicio, Math.round(duracao * 0.65))
    const pronto = addMinutes(inicio, duracao + between(rng, -5, 15))
    const entregue = addMinutes(pronto, between(rng, 8, 70))
    const passou = (d: Date, s: NovaOrdem['status'][]) => (s.includes(status) ? toIsoLocal(d) : null)
    const all = ['lavando', 'acabamento', 'pronto', 'entregue'] as NovaOrdem['status'][]

    const oi = push({
      sql: `INSERT INTO ordens (numero, veiculo_id, cliente_id, status, entrada_em, inicio_em, acabamento_em, pronto_em,
              entregue_em, funcionario_id, subtotal, desconto, total, cortesia, demo)
            VALUES ((SELECT COALESCE(MAX(numero), 0) + 1 FROM ordens), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      params: [
        ref(carro.veiculoRef),
        ref(carro.clienteRef),
        status,
        toIsoLocal(entrada),
        passou(inicio, all),
        passou(acab, all.slice(1)),
        passou(pronto, all.slice(2)),
        passou(entregue, ['entregue']),
        pick(rng, funcs),
        tot.subtotal,
        tot.desconto + tot.cortesia,
        tot.total,
        cortesia ? 1 : 0,
      ],
    })
    for (const l of linhas) {
      push({
        sql: 'INSERT INTO ordem_itens (ordem_id, servico_id, nome, preco_unit, quantidade) VALUES (?, ?, ?, ?, 1)',
        params: [ref(oi), l.s.id, l.s.nome, l.preco_unit],
      })
    }
    if (status !== 'entregue') return { dinheiro: 0, fiado: false }

    if (cortesia) f.cortesias++
    else f.pagas++
    if (tot.total === 0) return { dinheiro: 0, fiado: false }

    const forma = weighted(rng, FORMAS)
    const pagoEm = toIsoLocal(entregue)
    if (forma === 'fiado') {
      const quitado = entregue < subDays(agoraRef, 3) && rng() < 0.6
      push({
        sql: `INSERT INTO pagamentos (ordem_id, forma, valor, pago_em, caixa_id, quitado_em, quitado_forma)
              VALUES (?, 'fiado', ?, ?, ?, ?, ?)`,
        params: [
          ref(oi),
          tot.total,
          pagoEm,
          caixaRef === null ? null : ref(caixaRef),
          quitado ? toIsoLocal(addMinutes(entregue, 60 * 24 * 2)) : null,
          quitado ? 'pix' : null,
        ],
      })
      return { dinheiro: 0, fiado: true }
    }
    // Às vezes o cliente divide entre Pix e dinheiro
    if (forma === 'dinheiro' && tot.total > 6000 && rng() < 0.3) {
      const pix = Math.round(tot.total / 2 / 100) * 100
      push({
        sql: "INSERT INTO pagamentos (ordem_id, forma, valor, pago_em, caixa_id) VALUES (?, 'pix', ?, ?, ?)",
        params: [ref(oi), pix, pagoEm, caixaRef === null ? null : ref(caixaRef)],
      })
      push({
        sql: "INSERT INTO pagamentos (ordem_id, forma, valor, pago_em, caixa_id) VALUES (?, 'dinheiro', ?, ?, ?)",
        params: [ref(oi), tot.total - pix, pagoEm, caixaRef === null ? null : ref(caixaRef)],
      })
      return { dinheiro: tot.total - pix, fiado: false }
    }
    push({
      sql: 'INSERT INTO pagamentos (ordem_id, forma, valor, pago_em, caixa_id) VALUES (?, ?, ?, ?, ?)',
      params: [ref(oi), forma, tot.total, pagoEm, caixaRef === null ? null : ref(caixaRef)],
    })
    return { dinheiro: forma === 'dinheiro' ? tot.total : 0, fiado: false }
  }

  const horarioEntrada = (dia: Date) => {
    // Picos de manhã (9h–11h) e à tarde (14h–16h)
    const hora = weighted(rng, [
      [8, 6],
      [9, 12],
      [10, 13],
      [11, 9],
      [12, 4],
      [13, 7],
      [14, 11],
      [15, 11],
      [16, 7],
      [17, 3],
    ] as const)
    return setMinutes(setHours(dia, hora), between(rng, 0, 59))
  }
  const ativos = frota.filter((c) => c.peso > 0)
  const sumidos = frota.filter((c) => c.peso === 0)
  const escolherCarro = () =>
    weighted(
      rng,
      ativos.map((c) => [c, c.peso] as const),
    )

  // Clientes "sumidos": vieram 1 ou 2 vezes entre 35 e 70 dias atrás.
  for (const carro of sumidos) {
    const vezes = between(rng, 1, 2)
    for (let k = 0; k < vezes; k++) {
      const dia = startOfDay(subDays(agora, between(rng, 35, 70)))
      criarOrdem({ carro, entrada: horarioEntrada(dia), status: 'entregue', caixaRef: null, agoraRef: agora })
    }
  }

  // 30 dias de histórico, com caixa aberto às 8h e fechado às 18h
  for (let d = 30; d >= 1; d--) {
    const dia = startOfDay(subDays(agora, d))
    const [min, max] = MOVIMENTO_DIA[dia.getDay()]!
    const abertura = 15000
    const caixaRef = push({
      sql: `INSERT INTO caixa (aberto_em, valor_abertura, usuario_id, demo) VALUES (?, ?, ?, 1)`,
      params: [toIsoLocal(setHours(dia, 8)), abertura, dono?.id ?? null],
    })
    let dinheiro = 0
    const entradas = Array.from({ length: between(rng, min, max) }, () => horarioEntrada(dia)).sort(
      (a, b) => a.getTime() - b.getTime(),
    )
    for (const entrada of entradas) {
      dinheiro += criarOrdem({
        carro: escolherCarro(),
        entrada,
        status: 'entregue',
        caixaRef,
        agoraRef: agora,
      }).dinheiro
    }
    // Sangria nos dias cheios e despesa pequena paga com dinheiro da gaveta
    let sangria = 0
    if (dinheiro > 30000) {
      sangria = Math.floor((dinheiro * 0.6) / 1000) * 1000
      push({
        sql: "INSERT INTO movimentos_caixa (caixa_id, tipo, descricao, valor, criado_em) VALUES (?, 'sangria', 'Depósito no banco', ?, ?)",
        params: [ref(caixaRef), sangria, toIsoLocal(setHours(dia, 15))],
      })
    }
    let despesaGaveta = 0
    if (rng() < 0.35) {
      despesaGaveta = between(rng, 15, 45) * 100
      push({
        sql: "INSERT INTO despesas (descricao, categoria, valor, data, caixa_id, demo) VALUES (?, 'Alimentação', ?, ?, ?, 1)",
        params: ['Lanche da equipe', despesaGaveta, toIsoLocal(setHours(dia, 12)), ref(caixaRef)],
      })
    }
    const esperadoDinheiro = abertura + dinheiro - sangria - despesaGaveta
    const diferenca = rng() < 0.15 ? pick(rng, [-500, -200, 300, -1000]) : 0
    push({
      sql: `UPDATE caixa SET fechado_em = ?, valor_fechamento_informado = ?, diferenca = ? WHERE id = ?`,
      params: [toIsoLocal(setHours(dia, 18)), esperadoDinheiro + diferenca, diferenca, ref(caixaRef)],
    })
  }

  // Despesas do mês (pagas por fora do caixa)
  const despesasFixas: [string, string, number, number][] = [
    ['Aluguel do galpão', 'Aluguel', 220000, 28],
    ['Conta de água', 'Água e luz', 38000, 20],
    ['Conta de luz', 'Água e luz', 26500, 18],
    ['Shampoo automotivo 20L', 'Produtos', 18900, 25],
    ['Cera de carnaúba', 'Produtos', 12400, 14],
    ['Pretinho e silicone', 'Produtos', 8600, 9],
    ['Microfibras (kit 20)', 'Produtos', 9800, 6],
    ['Manutenção da lavadora', 'Manutenção', 35000, 12],
    ['Internet e telefone', 'Outros', 12000, 16],
  ]
  for (const [descricao, categoria, valor, diasAtras] of despesasFixas) {
    push({
      sql: 'INSERT INTO despesas (descricao, categoria, valor, data, demo) VALUES (?, ?, ?, ?, 1)',
      params: [descricao, categoria, valor, toIsoLocal(setHours(startOfDay(subDays(agora, diasAtras)), 10))],
    })
  }

  // Hoje: caixa aberto, alguns carros já entregues e a fila em andamento
  const hoje = startOfDay(agora)
  const caixaHoje = push({
    sql: 'INSERT INTO caixa (aberto_em, valor_abertura, usuario_id, demo) VALUES (?, ?, ?, 1)',
    params: [toIsoLocal(setHours(hoje, 8)), 15000, dono?.id ?? null],
  })
  const minutosAbertos = Math.max(0, (agora.getTime() - setHours(hoje, 8).getTime()) / 60000)
  const jaEntregues = Math.min(8, Math.floor(minutosAbertos / 75))
  for (let k = 0; k < jaEntregues; k++) {
    const entrada = addMinutes(
      setHours(hoje, 8),
      Math.round((k / Math.max(1, jaEntregues)) * (minutosAbertos - 90)),
    )
    criarOrdem({ carro: escolherCarro(), entrada, status: 'entregue', caixaRef: caixaHoje, agoraRef: agora })
  }
  const fila: [NovaOrdem['status'], number][] = [
    ['pronto', 75],
    ['acabamento', 55],
    ['lavando', 40],
    ['lavando', 25],
    ['aguardando', 12],
    ['aguardando', 4],
  ]
  const usados = new Set<number>()
  for (const [status, minutosAtras] of fila) {
    let carro = escolherCarro()
    for (let t = 0; t < 10 && usados.has(carro.veiculoRef); t++) carro = escolherCarro()
    usados.add(carro.veiculoRef)
    criarOrdem({
      carro,
      entrada: addMinutes(agora, -minutosAtras),
      status,
      caixaRef: caixaHoje,
      agoraRef: agora,
    })
  }

  // Agenda: horários de hoje (à frente) e dos próximos dias
  const meiaHora = (d: Date) => setMinutes(d, d.getMinutes() < 30 ? 30 : 0)
  const proxima = meiaHora(addMinutes(agora, agora.getMinutes() < 30 ? 60 : 30))
  const horarios: [Date, 'agendado' | 'confirmado'][] = [
    [proxima, 'confirmado'],
    [addMinutes(proxima, 90), 'agendado'],
    [setMinutes(setHours(addDays(hoje, 1), 9), 0), 'confirmado'],
    [setMinutes(setHours(addDays(hoje, 1), 10), 30), 'agendado'],
    [setMinutes(setHours(addDays(hoje, 1), 14), 0), 'agendado'],
    [setMinutes(setHours(addDays(hoje, 2), 9), 30), 'agendado'],
    [setMinutes(setHours(addDays(hoje, 3), 11), 0), 'confirmado'],
  ]
  const agendados = new Set<number>()
  for (const [quando, status] of horarios) {
    let carro = escolherCarro()
    for (let t = 0; t < 20 && agendados.has(carro.veiculoRef); t++) carro = escolherCarro()
    agendados.add(carro.veiculoRef)
    const possiveis = servicosPeso.filter(([sv]) => precoPorTipo(sv, carro.tipo) > 0)
    const sv = weighted(rng, possiveis)
    const item = { servico_id: sv.id, nome: sv.nome, preco_unit: precoPorTipo(sv, carro.tipo) }
    const cli = CLIENTES[carro.clienteIdx]!
    push({
      sql: `INSERT INTO agendamentos (data_hora, duracao_min, status, cliente_id, veiculo_id, nome, telefone, tipo,
              servicos, total, criado_em, demo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      params: [
        toIsoLocal(quando),
        sv.duracao_min,
        status,
        ref(carro.clienteRef),
        ref(carro.veiculoRef),
        cli.nome,
        cli.tel,
        carro.tipo,
        JSON.stringify([item]),
        item.preco_unit,
        ini,
      ],
    })
  }
  // Um cliente novo, ainda sem cadastro
  const simples = servicos.find((sv) => sv.nome.toLowerCase().includes('simples')) ?? servicos[0]!
  push({
    sql: `INSERT INTO agendamentos (data_hora, duracao_min, status, nome, telefone, placa, modelo, cor, tipo,
            servicos, total, observacoes, criado_em, demo) VALUES (?, ?, 'agendado', ?, ?, ?, ?, ?, 'carro', ?, ?, ?, ?, 1)`,
    params: [
      toIsoLocal(setMinutes(setHours(addDays(hoje, 1), 16), 0)),
      simples.duracao_min,
      'Renata Alves',
      '11966665555',
      gerarPlaca(rng, placas),
      'Renault Sandero',
      'Branco',
      JSON.stringify([{ servico_id: simples.id, nome: simples.nome, preco_unit: simples.preco_carro }]),
      simples.preco_carro,
      'Primeira vez — indicação da Ana Paula',
      ini,
    ],
  })

  await db.transaction(stmts)
}

/** Remove tudo que veio do seed de demonstração, preservando os dados reais. */
export async function removerDemo(db: Db): Promise<void> {
  const demoUsers = 'SELECT id FROM usuarios WHERE demo = 1'
  await db.transaction([
    { sql: `UPDATE ordens SET funcionario_id = NULL WHERE demo = 0 AND funcionario_id IN (${demoUsers})` },
    { sql: `UPDATE caixa SET usuario_id = NULL WHERE demo = 0 AND usuario_id IN (${demoUsers})` },
    {
      sql: 'DELETE FROM agendamentos WHERE demo = 1 OR cliente_id IN (SELECT id FROM clientes WHERE demo = 1)',
    },
    { sql: 'DELETE FROM ordens WHERE demo = 1 OR cliente_id IN (SELECT id FROM clientes WHERE demo = 1)' },
    { sql: 'DELETE FROM despesas WHERE demo = 1' },
    // O caixa aberto de hoje pode já ter movimento real: fica, apenas deixa de ser "demo".
    { sql: 'UPDATE caixa SET demo = 0 WHERE demo = 1 AND fechado_em IS NULL' },
    { sql: 'DELETE FROM caixa WHERE demo = 1' },
    { sql: 'DELETE FROM clientes WHERE demo = 1' },
    { sql: 'DELETE FROM usuarios WHERE demo = 1' },
  ])
}
