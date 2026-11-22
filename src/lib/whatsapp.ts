import { normalizarTelefone } from './telefone'

export type VariaveisMensagem = Partial<
  Record<'nome' | 'modelo' | 'placa' | 'total' | 'empresa' | 'data' | 'hora' | 'servicos', string>
>

export const VARIAVEIS_MENSAGEM = ['{nome}', '{modelo}', '{placa}', '{total}', '{empresa}'] as const
export const VARIAVEIS_AGENDA = ['{data}', '{hora}', '{servicos}'] as const

/** Troca {nome}, {modelo}… pelos valores. Variáveis sem valor somem sem deixar chaves soltas. */
export function preencherModelo(modelo: string, vars: VariaveisMensagem): string {
  return modelo
    .replace(/\{(\w+)\}/g, (_, chave: string) => {
      const v = vars[chave as keyof VariaveisMensagem]
      return v ?? ''
    })
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** Primeiro nome, para mensagens mais pessoais. */
export function primeiroNome(nome: string): string {
  return (nome ?? '').trim().split(/\s+/)[0] ?? ''
}

export function linkWhatsApp(telefone: string | null | undefined, mensagem: string): string | null {
  const t = normalizarTelefone(telefone)
  if (t.length < 10) return null
  return `https://wa.me/55${t}?text=${encodeURIComponent(mensagem)}`
}
