import type { Relatorio } from '@/db/repositories/relatorios'
import { formatarData } from '@/lib/datas'
import { formatBRL } from '@/lib/money'
import { labelForma } from '@/lib/ordem'

/** Versão para impressão / "Salvar como PDF": tabelas limpas, fundo branco, tamanho A4. */
export function RelatorioImpressao({ r, empresa }: { r: Relatorio; empresa: string }) {
  const th = 'border-b border-black/30 py-1 text-left font-semibold'
  const td = 'border-b border-black/10 py-1'
  const tdr = `${td} text-right tabular-nums`
  return (
    <div className="print-report bg-white p-2 font-sans text-[11px] text-black">
      <h1 className="text-lg font-bold">{empresa} — Relatório</h1>
      <p className="mb-4 text-black/70">
        Período: {formatarData(r.periodo.inicio)} a {formatarData(r.periodo.fim)} · emitido em{' '}
        {formatarData(new Date())}
      </p>
      <table className="mb-4 w-full">
        <tbody>
          {(
            [
              ['Faturamento', formatBRL(r.resumo.faturamento)],
              ['Carros atendidos', String(r.resumo.carros)],
              ['Ticket médio', formatBRL(r.resumo.ticketMedio)],
              ['Descontos concedidos', formatBRL(r.resumo.descontos)],
              ['Despesas', formatBRL(r.resumo.despesas)],
              ['Lucro estimado', formatBRL(r.resumo.lucro)],
              ['Fiado em aberto', formatBRL(r.resumo.fiadoEmAberto)],
              ['Clientes novos / recorrentes', `${r.clientes.novos} / ${r.clientes.recorrentes}`],
            ] as const
          ).map(([k, v]) => (
            <tr key={k}>
              <td className={td}>{k}</td>
              <td className={tdr}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-2 gap-6">
        <section>
          <h2 className="mb-1 font-bold">Por forma de pagamento</h2>
          <table className="w-full">
            <tbody>
              {r.formas.map((f) => (
                <tr key={f.forma}>
                  <td className={td}>{labelForma(f.forma)}</td>
                  <td className={tdr}>{formatBRL(f.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="mt-4 mb-1 font-bold">Por funcionário</h2>
          <table className="w-full">
            <tbody>
              {r.funcionarios.map((f) => (
                <tr key={f.nome}>
                  <td className={td}>{f.nome}</td>
                  <td className={tdr}>{f.carros} carros</td>
                  <td className={tdr}>{formatBRL(f.faturamento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="mt-4 mb-1 font-bold">Despesas por categoria</h2>
          <table className="w-full">
            <tbody>
              {r.despesas.map((d) => (
                <tr key={d.categoria}>
                  <td className={td}>{d.categoria}</td>
                  <td className={tdr}>{formatBRL(d.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h2 className="mb-1 font-bold">Por serviço</h2>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Serviço</th>
                <th className={`${th} text-right`}>Qtd.</th>
                <th className={`${th} text-right`}>Receita</th>
              </tr>
            </thead>
            <tbody>
              {r.servicos.map((s) => (
                <tr key={s.nome}>
                  <td className={td}>{s.nome}</td>
                  <td className={tdr}>{s.quantidade}</td>
                  <td className={tdr}>{formatBRL(s.receita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <h2 className="mt-4 mb-1 font-bold">Faturamento por dia</h2>
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Data</th>
            <th className={`${th} text-right`}>Carros</th>
            <th className={`${th} text-right`}>Faturamento</th>
          </tr>
        </thead>
        <tbody>
          {r.porDia.map((d) => (
            <tr key={d.dia}>
              <td className={td}>{formatarData(d.dia)}</td>
              <td className={tdr}>{d.carros}</td>
              <td className={tdr}>{formatBRL(d.faturamento)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
