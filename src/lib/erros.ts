/** Converte erros técnicos em mensagens amigáveis em português. */
export function mensagemErro(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  if (/UNIQUE constraint failed: veiculos\.placa/i.test(msg)) return 'Já existe um veículo com essa placa.'
  if (/UNIQUE/i.test(msg)) return 'Esse registro já existe.'
  if (/FOREIGN KEY/i.test(msg)) return 'Não dá para apagar: há registros ligados a este item.'
  if (/database is locked|busy/i.test(msg)) return 'O banco está ocupado. Tente de novo em alguns segundos.'
  if (/no such table/i.test(msg)) return 'O banco de dados está desatualizado. Reinicie o aplicativo.'
  if (/permission|denied|forbidden/i.test(msg)) return 'Sem permissão para acessar esse arquivo ou pasta.'
  return msg && msg.length < 140 ? msg : 'Algo deu errado. Tente novamente.'
}
