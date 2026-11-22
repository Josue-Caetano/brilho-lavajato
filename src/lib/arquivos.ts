import { isTauri } from '@/db'

export interface FiltroArquivo {
  name: string
  extensions: string[]
}

/**
 * Salva bytes num arquivo escolhido pelo usuário. No app abre o "Salvar como" do Windows;
 * no navegador, baixa o arquivo. Retorna o caminho (ou nome) salvo, ou null se cancelado.
 */
export async function salvarArquivo(
  nome: string,
  bytes: Uint8Array,
  filtro: FiltroArquivo,
  mime = 'application/octet-stream',
): Promise<string | null> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile } = await import('@tauri-apps/plugin-fs')
    const caminho = await save({ defaultPath: nome, filters: [filtro] })
    if (!caminho) return null
    await writeFile(caminho, bytes)
    return caminho
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return nome
}

/** Abre um arquivo escolhido pelo usuário e devolve nome + bytes (ou null se cancelado). */
export async function abrirArquivo(
  filtro: FiltroArquivo,
): Promise<{ nome: string; bytes: Uint8Array } | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const caminho = await open({ multiple: false, directory: false, filters: [filtro] })
    if (!caminho || Array.isArray(caminho)) return null
    return { nome: caminho.split(/[\\/]/).pop() ?? caminho, bytes: await readFile(caminho) }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = filtro.extensions.map((e) => `.${e}`).join(',')
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return resolve(null)
      resolve({ nome: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}
