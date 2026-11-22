/** Regras de preço, desconto, total e pagamento de uma ordem de serviço. Tudo em centavos. */

export type TipoVeiculo = 'carro' | 'moto' | 'caminhonete' | 'van'
export const TIPOS_VEICULO: { value: TipoVeiculo; label: string }[] = [
  { value: 'carro', label: 'Carro' },
  { value: 'caminhonete', label: 'Caminhonete/SUV' },
  { value: 'van', label: 'Van' },
  { value: 'moto', label: 'Moto' },
]

export interface PrecosServico {
  preco_carro: number
  preco_caminhonete: number
  preco_moto: number
}

/** Preço do serviço para o tipo de veículo. Van usa o preço de caminhonete (porte equivalente). */
export function precoPorTipo(servico: PrecosServico, tipo: TipoVeiculo): number {
  switch (tipo) {
    case 'moto':
      return servico.preco_moto
    case 'caminhonete':
    case 'van':
      return servico.preco_caminhonete
    default:
      return servico.preco_carro
  }
}

export interface ItemCalculo {
  preco_unit: number
  quantidade: number
}

export function calcularSubtotal(itens: ItemCalculo[]): number {
  return itens.reduce((acc, i) => acc + Math.max(0, i.preco_unit) * Math.max(0, i.quantidade), 0)
}

export type Desconto = { tipo: 'valor'; valor: number } | { tipo: 'percentual'; valor: number }

/** Converte o desconto em centavos, limitado à base (nunca deixa o total negativo). */
export function calcularDesconto(base: number, desconto: Desconto | null | undefined): number {
  if (!desconto || base <= 0) return 0
  const bruto =
    desconto.tipo === 'percentual'
      ? Math.round((base * Math.min(100, Math.max(0, desconto.valor))) / 100)
      : Math.max(0, Math.round(desconto.valor))
  return Math.min(base, bruto)
}

/** Valor do serviço principal (o mais caro), zerado na lavagem grátis da fidelidade. */
export function valorServicoPrincipal(itens: ItemCalculo[]): number {
  return itens.reduce((max, i) => Math.max(max, i.preco_unit), 0)
}

export interface Totais {
  subtotal: number
  cortesia: number
  desconto: number
  total: number
}

export function calcularTotais(
  itens: ItemCalculo[],
  desconto?: Desconto | null,
  aplicarCortesia = false,
): Totais {
  const subtotal = calcularSubtotal(itens)
  const cortesia = aplicarCortesia ? Math.min(subtotal, valorServicoPrincipal(itens)) : 0
  const descontoValor = calcularDesconto(subtotal - cortesia, desconto)
  return { subtotal, cortesia, desconto: descontoValor, total: subtotal - cortesia - descontoValor }
}

export type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'fiado'
export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'fiado', label: 'Fiado' },
]
export const labelForma = (f: string) => FORMAS_PAGAMENTO.find((x) => x.value === f)?.label ?? f

export interface ParcelaPagamento {
  forma: FormaPagamento
  valor: number
}

export interface ResumoPagamento {
  informado: number
  /** Quanto falta pagar (0 se já cobre o total). */
  restante: number
  /** Troco a devolver — só existe quando o excedente cabe no que foi pago em dinheiro. */
  troco: number
  /** Valor que de fato fica com a loja em cada forma (dinheiro já descontado do troco). */
  porForma: Record<FormaPagamento, number>
  valido: boolean
  erro?: string
}

export function resumirPagamento(total: number, parcelas: ParcelaPagamento[]): ResumoPagamento {
  const porForma: Record<FormaPagamento, number> = { dinheiro: 0, pix: 0, debito: 0, credito: 0, fiado: 0 }
  for (const p of parcelas) porForma[p.forma] += Math.max(0, p.valor)
  const informado = Object.values(porForma).reduce((a, b) => a + b, 0)
  const restante = Math.max(0, total - informado)
  const excedente = Math.max(0, informado - total)
  let erro: string | undefined
  if (restante > 0) erro = 'O valor informado não cobre o total.'
  else if (excedente > porForma.dinheiro) erro = 'Só é possível dar troco sobre pagamento em dinheiro.'
  const troco = erro ? 0 : excedente
  porForma.dinheiro -= troco
  return { informado, restante, troco, porForma, valido: !erro, erro }
}
