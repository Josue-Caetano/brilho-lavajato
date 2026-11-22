import { create } from 'zustand'
import type { Usuario } from '@/db/repositories/usuarios'

interface SessaoState {
  usuario: Usuario | null
  entrar: (u: Usuario) => void
  sair: () => void
}

/** Sessão fica só em memória: fechar o app exige o PIN de novo. */
export const useSessao = create<SessaoState>((set) => ({
  usuario: null,
  entrar: (usuario) => set({ usuario }),
  sair: () => set({ usuario: null }),
}))

export const useEhDono = () => useSessao((s) => s.usuario?.papel === 'dono')
