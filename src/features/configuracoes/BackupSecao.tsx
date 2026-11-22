import { DatabaseBackup, FolderOpen, HardDrive, RotateCcw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { queryClient, qk } from '@/app/queries'
import { Button } from '@/components/ui/button'
import { confirmar } from '@/components/ui/confirm'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { isTauri } from '@/db'
import type { Configuracoes } from '@/db/repositories/configuracoes'
import { escolherPastaBackup, fazerBackup, restaurarBackup } from '@/lib/backupIo'
import { formatarDataHora } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { gravarConfig, Secao } from './comum'

export function BackupSecao({ cfg }: { cfg: Configuracoes }) {
  const [b, setB] = useState(cfg.backup)
  const [ocupado, setOcupado] = useState<'backup' | 'restaurar' | null>(null)
  const app = isTauri()

  const salvar = async (novo: typeof b, msg?: string) => {
    setB(novo)
    await gravarConfig('backup', { ...novo, ultimo: cfg.backup.ultimo }, msg)
  }

  return (
    <Secao
      titulo="Backup"
      descricao="Cópia do banco de dados numa pasta segura — pen drive, Google Drive ou OneDrive instalados no computador."
    >
      {app ? (
        <div className="flex flex-col gap-5">
          <Field
            label="Pasta de backup"
            htmlFor="bk-pasta"
            hint="Mantemos os últimos 30 arquivos; os mais antigos são apagados."
          >
            <div className="flex gap-2">
              <Input id="bk-pasta" readOnly value={b.pasta} placeholder="Nenhuma pasta escolhida" />
              <Button
                variant="secondary"
                onClick={async () => {
                  const pasta = await escolherPastaBackup()
                  if (pasta) await salvar({ ...b, pasta }, 'Pasta de backup definida.')
                }}
              >
                <FolderOpen /> Escolher
              </Button>
            </div>
          </Field>
          <div className="flex flex-wrap items-end gap-6">
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={b.ativo}
                onCheckedChange={(ativo) =>
                  salvar(
                    { ...b, ativo },
                    ativo ? 'Backup automático ligado.' : 'Backup automático desligado.',
                  )
                }
                aria-label="Backup automático"
              />
              Backup automático ao fechar o app e a cada
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={24}
                aria-label="Intervalo em horas"
                className="w-20"
                value={b.intervaloHoras}
                disabled={!b.ativo}
                onChange={(e) =>
                  setB((x) => ({
                    ...x,
                    intervaloHoras: Math.min(24, Math.max(1, Number(e.target.value) || 1)),
                  }))
                }
                onBlur={() => salvar(b, '')}
              />
              <span className="text-muted text-sm">horas</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="border-warning/30 bg-warning-tint text-warning flex items-start gap-2 rounded-xl border p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Modo navegador (demonstração): o backup baixa uma cópia do banco. No app instalado, ele é salvo
          automaticamente na pasta escolhida.
        </p>
      )}

      <div className="bg-surface-2 flex flex-wrap items-center gap-3 rounded-[14px] p-4">
        <HardDrive className="text-muted size-5" />
        <span className="flex-1 text-sm">
          {cfg.backup.ultimo ? (
            <>
              Último backup: <strong>{formatarDataHora(cfg.backup.ultimo)}</strong>
            </>
          ) : (
            'Nenhum backup feito ainda.'
          )}
        </span>
        <Button
          variant="primary"
          loading={ocupado === 'backup'}
          disabled={app && !b.pasta}
          onClick={async () => {
            setOcupado('backup')
            try {
              const destino = await fazerBackup()
              await queryClient.invalidateQueries({ queryKey: qk.config })
              if (destino) toast.success('Backup feito.', { description: destino })
            } catch (e) {
              toast.error(mensagemErro(e))
            } finally {
              setOcupado(null)
            }
          }}
        >
          <DatabaseBackup /> Fazer backup agora
        </Button>
        <Button
          variant="danger-soft"
          loading={ocupado === 'restaurar'}
          onClick={async () => {
            const ok = await confirmar({
              titulo: 'Restaurar um backup?',
              descricao: (
                <>
                  Todos os dados atuais serão substituídos pelos do arquivo escolhido.
                  {app &&
                    ' Antes disso, guardamos uma cópia de segurança do banco atual. O app reinicia em seguida.'}
                </>
              ),
              confirmar: 'Escolher arquivo e restaurar',
              perigoso: true,
            })
            if (!ok) return
            setOcupado('restaurar')
            try {
              await restaurarBackup()
            } catch (e) {
              toast.error(mensagemErro(e))
            } finally {
              setOcupado(null)
            }
          }}
        >
          <RotateCcw /> Restaurar backup
        </Button>
      </div>
    </Secao>
  )
}
