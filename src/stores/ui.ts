import { create } from 'zustand'
import type { Agendamento } from '@/db/repositories/agendamentos'
import { preferencias, salvarPreferencias, type Preferencias } from '@/lib/prefs'

interface UiState {
  novoCarro: boolean
  busca: boolean
  ajuda: boolean
  /** Ordem aberta no modal "Entregar e cobrar". */
  pagamentoOrdemId: number | null
  /** Ordem cujo comprovante está em prévia. */
  comprovanteOrdemId: number | null
  /** Modal de agendamento: novo (com data/hora sugeridas) ou edição. */
  agendamento: { aberto: boolean; editar?: Agendamento | null; data?: string; hora?: string }
  prefs: Preferencias
  abrirNovoCarro: () => void
  fecharNovoCarro: () => void
  setBusca: (v: boolean) => void
  setAjuda: (v: boolean) => void
  abrirPagamento: (id: number) => void
  fecharPagamento: () => void
  abrirComprovante: (id: number | null) => void
  abrirAgendamento: (o?: { editar?: Agendamento | null; data?: string; hora?: string }) => void
  fecharAgendamento: () => void
  setPrefs: (p: Partial<Preferencias>) => void
}

export const useUi = create<UiState>((set) => ({
  novoCarro: false,
  busca: false,
  ajuda: false,
  pagamentoOrdemId: null,
  comprovanteOrdemId: null,
  agendamento: { aberto: false },
  prefs: preferencias(),
  abrirNovoCarro: () => set({ novoCarro: true, busca: false }),
  fecharNovoCarro: () => set({ novoCarro: false }),
  setBusca: (busca) => set({ busca }),
  setAjuda: (ajuda) => set({ ajuda }),
  abrirPagamento: (pagamentoOrdemId) => set({ pagamentoOrdemId }),
  fecharPagamento: () => set({ pagamentoOrdemId: null }),
  abrirComprovante: (comprovanteOrdemId) => set({ comprovanteOrdemId }),
  abrirAgendamento: (o = {}) => set({ agendamento: { aberto: true, ...o }, busca: false }),
  fecharAgendamento: () => set({ agendamento: { aberto: false } }),
  setPrefs: (p) => {
    void salvarPreferencias(p).then((prefs) => set({ prefs }))
  },
}))
