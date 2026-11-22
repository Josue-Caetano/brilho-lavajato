import type { Configuracoes } from '@/db/repositories/configuracoes'
import type { Comprovante as Dados } from '@/db/repositories/ordens'
import { formatarDataHora } from '@/lib/datas'
import { formatBRL } from '@/lib/money'
import { labelForma } from '@/lib/ordem'
import { formatarPlaca } from '@/lib/placa'
import { formatarTelefone } from '@/lib/telefone'

/** Comprovante não fiscal para impressora térmica (80 mm ou 58 mm). Fundo branco e fonte monoespaçada. */
export function Comprovante({ dados, cfg }: { dados: Dados; cfg: Configuracoes }) {
  const largura = cfg.impressao.largura === '58' ? '58mm' : '80mm'
  const pequeno = cfg.impressao.largura === '58'
  const linha = <div className="my-2 border-t border-dashed border-black" />
  const pagos = dados.pagamentos
  return (
    <div
      className="bg-white p-3 font-mono leading-snug text-black"
      style={{ width: largura, fontSize: pequeno ? 10 : 12 }}
    >
      <div className="text-center">
        {cfg.empresa.logo && (
          <img src={cfg.empresa.logo} alt="" className="mx-auto mb-1 max-h-14 object-contain grayscale" />
        )}
        <p className="font-bold" style={{ fontSize: pequeno ? 12 : 15 }}>
          {cfg.empresa.nome}
        </p>
        {cfg.empresa.cnpj && <p>CNPJ {cfg.empresa.cnpj}</p>}
        {cfg.empresa.endereco && <p>{cfg.empresa.endereco}</p>}
        {cfg.empresa.telefone && <p>{formatarTelefone(cfg.empresa.telefone)}</p>}
      </div>
      {linha}
      <p className="text-center font-bold">COMPROVANTE NÃO FISCAL</p>
      <p>Ordem nº {String(dados.numero).padStart(5, '0')}</p>
      <p>{formatarDataHora(dados.entregue_em ?? dados.entrada_em)}</p>
      <p>Cliente: {dados.cliente_nome}</p>
      <p>
        Veículo: {formatarPlaca(dados.placa)}
        {dados.modelo ? ` · ${dados.modelo}` : ''}
      </p>
      {linha}
      {dados.itens.map((i) => (
        <div key={i.id} className="flex justify-between gap-2">
          <span>
            {i.quantidade > 1 ? `${i.quantidade}x ` : ''}
            {i.nome}
          </span>
          <span className="whitespace-nowrap">{formatBRL(i.preco_unit * i.quantidade)}</span>
        </div>
      ))}
      {linha}
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatBRL(dados.subtotal)}</span>
      </div>
      {dados.desconto > 0 && (
        <div className="flex justify-between">
          <span>{dados.cortesia ? 'Desconto (lavagem grátis)' : 'Desconto'}</span>
          <span>- {formatBRL(dados.desconto)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold" style={{ fontSize: pequeno ? 12 : 14 }}>
        <span>TOTAL</span>
        <span>{formatBRL(dados.total)}</span>
      </div>
      {pagos.length > 0 && (
        <>
          {linha}
          {pagos.map((p) => (
            <div key={p.id} className="flex justify-between">
              <span>{labelForma(p.forma)}</span>
              <span>{formatBRL(p.valor)}</span>
            </div>
          ))}
        </>
      )}
      {linha}
      <p className="text-center">{cfg.impressao.rodape}</p>
      {dados.funcionario_nome && <p className="mt-1 text-center">Atendido por {dados.funcionario_nome}</p>}
    </div>
  )
}
