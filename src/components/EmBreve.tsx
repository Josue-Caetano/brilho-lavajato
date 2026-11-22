import { Hammer } from 'lucide-react'
import { Card } from './ui/card'
import { EmptyState } from './ui/misc'

export function EmBreve({ titulo }: { titulo: string }) {
  return (
    <Card>
      <EmptyState icon={Hammer} titulo={titulo} descricao="Esta tela chega numa das próximas fases." />
    </Card>
  )
}
