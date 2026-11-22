import { isTauri } from '@/db'

/** Preferências deste computador (tema, fonte…). No app usa o plugin store do Tauri; no navegador, localStorage. */
export interface Preferencias {
  tema: 'escuro' | 'claro'
  fonte: 'normal' | 'grande' | 'maior'
  ultimoUsuarioId: number | null
}

const PADRAO: Preferencias = { tema: 'escuro', fonte: 'normal', ultimoUsuarioId: null }
const LS_KEY = 'brilho-preferencias'
const ESCALA = { normal: 1, grande: 1.08, maior: 1.16 }

let atual: Preferencias = { ...PADRAO }

type StoreLike = {
  get<T>(k: string): Promise<T | undefined>
  set(k: string, v: unknown): Promise<void>
  save(): Promise<void>
}
let store: StoreLike | null = null

async function getStore(): Promise<StoreLike | null> {
  if (!isTauri()) return null
  if (!store) {
    const { LazyStore } = await import('@tauri-apps/plugin-store')
    store = new LazyStore('preferencias.json') as unknown as StoreLike
  }
  return store
}

export function aplicarPreferencias(p: Preferencias) {
  const html = document.documentElement
  html.dataset.theme = p.tema === 'claro' ? 'light' : 'dark'
  html.style.setProperty('--font-scale', String(ESCALA[p.fonte] ?? 1))
}

export async function carregarPreferencias(): Promise<Preferencias> {
  try {
    const s = await getStore()
    const salvo = s ? await s.get<Preferencias>('prefs') : JSON.parse(localStorage.getItem(LS_KEY) ?? 'null')
    atual = { ...PADRAO, ...(salvo ?? {}) }
  } catch {
    atual = { ...PADRAO }
  }
  aplicarPreferencias(atual)
  return atual
}

export function preferencias(): Preferencias {
  return atual
}

export async function salvarPreferencias(parcial: Partial<Preferencias>): Promise<Preferencias> {
  atual = { ...atual, ...parcial }
  aplicarPreferencias(atual)
  try {
    const s = await getStore()
    if (s) {
      await s.set('prefs', atual)
      await s.save()
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(atual))
    }
  } catch {
    // preferência não salva não deve travar o uso
  }
  return atual
}
