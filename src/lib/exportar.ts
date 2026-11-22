import { utils, write, type WorkSheet } from 'xlsx'
import type { OrdemRelatorio, Relatorio } from '@/db/repositories/relatorios'
import { formatarData, formatarDataHora } from './datas'
import { labelForma } from './ordem'
import { formatarPlaca } from './placa'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const reais = (c: number) => Math.round(c) / 100
const FMT_MOEDA = '"R$" #,##0.00'

/** Aplica formato de moeda às colunas indicadas (a partir da linha 2). */
function moeda(ws: WorkSheet, colunas: number[]) {
  const range = utils.decode_range(ws['!ref'] ?? 'A1')
  for (let r = 1; r <= range.e.r; r++) {
    for (const c of colunas) {
      const cell = ws[utils.encode_cell({ r, c })]
      if (cell && typeof cell.v === 'number') cell.z = FMT_MOEDA
    }
  }
}

function aba(linhas: Record<string, string | number>[], colMoeda: number[] = [], larguras?: number[]) {
  const ws = utils.json_to_sheet(linhas.length ? linhas : [{ Aviso: 'Sem dados no período' }])
  moeda(ws, colMoeda)
  if (larguras) ws['!cols'] = larguras.map((wch) => ({ wch }))
  return ws
}

/** Gera a planilha do relatório (uma aba por visão) e devolve os bytes do .xlsx. */
export function relatorioParaExcel(r: Relatorio, ordens: OrdemRelatorio[], empresa: string): Uint8Array {
  const wb = utils.book_new()
  const titulo = `${empresa} — ${formatarData(r.periodo.inicio)} a ${formatarData(r.periodo.fim)}`
  const resumo = utils.aoa_to_sheet([
    [titulo],
    [],
    ['Faturamento', reais(r.resumo.faturamento)],
    ['Carros atendidos', r.resumo.carros],
    ['Ticket médio', reais(r.resumo.ticketMedio)],
    ['Descontos concedidos', reais(r.resumo.descontos)],
    ['Despesas', reais(r.resumo.despesas)],
    ['Lucro estimado', reais(r.resumo.lucro)],
    ['Fiado em aberto', reais(r.resumo.fiadoEmAberto)],
    ['Clientes novos', r.clientes.novos],
    ['Clientes recorrentes', r.clientes.recorrentes],
  ])
  for (const row of [3, 5, 6, 7, 8, 9]) {
    const cell = resumo[utils.encode_cell({ r: row - 1, c: 1 })]
    if (cell) cell.z = FMT_MOEDA
  }
  resumo['!cols'] = [{ wch: 26 }, { wch: 16 }]
  utils.book_append_sheet(wb, resumo, 'Resumo')

  utils.book_append_sheet(
    wb,
    aba(
      r.porDia.map((d) => ({
        Data: formatarData(d.dia),
        Carros: d.carros,
        Faturamento: reais(d.faturamento),
      })),
      [2],
      [12, 8, 14],
    ),
    'Por dia',
  )
  utils.book_append_sheet(
    wb,
    aba(
      r.formas.map((f) => ({ Forma: labelForma(f.forma), Valor: reais(f.valor) })),
      [1],
      [14, 14],
    ),
    'Formas de pagamento',
  )
  utils.book_append_sheet(
    wb,
    aba(
      r.servicos.map((s) => ({ Serviço: s.nome, Quantidade: s.quantidade, Receita: reais(s.receita) })),
      [2],
      [28, 12, 14],
    ),
    'Serviços',
  )
  utils.book_append_sheet(
    wb,
    aba(
      r.funcionarios.map((f) => ({
        Funcionário: f.nome,
        Carros: f.carros,
        Faturamento: reais(f.faturamento),
      })),
      [2],
      [22, 8, 14],
    ),
    'Funcionários',
  )
  utils.book_append_sheet(
    wb,
    aba(
      r.despesas.map((d) => ({ Categoria: d.categoria, Valor: reais(d.valor) })),
      [1],
      [18, 14],
    ),
    'Despesas',
  )
  utils.book_append_sheet(
    wb,
    aba(
      r.calor.map((c) => ({
        Dia: DIAS[c.dia] ?? '',
        Hora: `${String(c.hora).padStart(2, '0')}h`,
        Carros: c.carros,
      })),
      [],
      [12, 8, 8],
    ),
    'Horários',
  )
  utils.book_append_sheet(
    wb,
    aba(
      ordens.map((o) => ({
        Nº: o.numero,
        Entregue: formatarDataHora(o.entregue_em),
        Cliente: o.cliente,
        Placa: formatarPlaca(o.placa),
        Serviços: o.servicos,
        Subtotal: reais(o.subtotal),
        Desconto: reais(o.desconto),
        Total: reais(o.total),
        Pagamento: (o.formas ?? '').split(' + ').filter(Boolean).map(labelForma).join(' + '),
        Funcionário: o.funcionario ?? '',
      })),
      [5, 6, 7],
      [7, 20, 24, 10, 32, 11, 11, 11, 18, 16],
    ),
    'Ordens',
  )
  return write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array
}
