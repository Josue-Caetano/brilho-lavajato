import { isTauri } from '@/db'

/** Abre um link externo (WhatsApp) no navegador padrão do Windows. */
export async function abrirLink(url: string) {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(url)
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
