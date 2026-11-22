import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/misc'
import { useUi } from '@/stores/ui'

export const ATALHOS: { teclas: string[]; descricao: string }[] = [
  { teclas: ['F2'], descricao: 'Novo carro' },
  { teclas: ['Ctrl', 'N'], descricao: 'Novo carro' },
  { teclas: ['F3'], descricao: 'Novo agendamento' },
  { teclas: ['Ctrl', 'K'], descricao: 'Busca global (placa, nome, telefone e ações)' },
  { teclas: ['F1'], descricao: 'Esta tela de ajuda' },
  {
    teclas: ['Enter'],
    descricao: 'Confirmar o formulário aberto (colocar na fila, entregar, fechar caixa…)',
  },
  { teclas: ['Esc'], descricao: 'Fechar janelas e menus' },
  { teclas: ['Tab'], descricao: 'Ir para o próximo campo ou botão' },
  { teclas: ['Espaço'], descricao: 'Na fila: pegar/soltar o cartão focado; use as setas para mover' },
  { teclas: ['0–9'], descricao: 'Na tela de entrada: digitar o PIN' },
]

export function AjudaDialog() {
  const aberta = useUi((s) => s.ajuda)
  const setAjuda = useUi((s) => s.setAjuda)
  return (
    <Dialog open={aberta} onOpenChange={setAjuda}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>Dá para usar o Brilho inteiro sem tirar a mão do teclado.</DialogDescription>
        </DialogHeader>
        <DialogBody className="pb-6">
          <table className="w-full text-[15px]">
            <tbody>
              {ATALHOS.map((a) => (
                <tr key={a.teclas.join('+') + a.descricao} className="border-border border-b last:border-0">
                  <td className="w-40 py-2.5">
                    <span className="flex items-center gap-1">
                      {a.teclas.map((t, i) => (
                        <span key={t} className="flex items-center gap-1">
                          {i > 0 && <span className="text-muted">+</span>}
                          <Kbd>{t}</Kbd>
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="py-2.5">{a.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
