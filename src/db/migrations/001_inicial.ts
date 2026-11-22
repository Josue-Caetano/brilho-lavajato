import type { Migration } from './index'

/*
 * Esquema inicial. Convenções:
 *  - valores monetários sempre em centavos (INTEGER);
 *  - datas em ISO 8601 no horário local ("2026-10-18T14:30:00"), o que permite
 *    agrupar por dia com date() sem conversão de fuso;
 *  - coluna `demo` marca registros do seed de demonstração, removíveis com um clique.
 *
 * Ajustes em relação ao modelo sugerido (e por quê):
 *  - ordens.subtotal: guarda o valor antes do desconto (relatórios de desconto concedido);
 *  - ordens.acabamento_em: sem ele não dá para medir há quanto tempo o carro está na secagem;
 *  - ordens.cortesia: marca a lavagem grátis da fidelidade (a fidelidade é calculada a partir disso);
 *  - ordem_itens.nome: cópia do nome do serviço, para o histórico não mudar se o serviço for renomeado;
 *  - pagamentos.caixa_id / quitado_*: ligam cada recebimento ao caixa aberto e permitem quitar o fiado depois;
 *  - despesas.caixa_id: despesa paga com dinheiro da gaveta entra no fechamento;
 *  - clientes.aniversario (MM-DD, opcional): alimenta a lista de aniversariantes do painel;
 *  - van usa o preço de caminhonete (porte equivalente), sem coluna extra.
 */
export const m001_inicial: Migration = {
  version: 1,
  nome: 'inicial',
  statements: [
    `CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      papel TEXT NOT NULL CHECK (papel IN ('dono','funcionario')),
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL,
      demo INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT,
      observacoes TEXT,
      aniversario TEXT,
      criado_em TEXT NOT NULL,
      demo INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE veiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      placa TEXT NOT NULL UNIQUE,
      modelo TEXT,
      cor TEXT,
      tipo TEXT NOT NULL DEFAULT 'carro' CHECK (tipo IN ('carro','moto','caminhonete','van')),
      criado_em TEXT NOT NULL
    )`,
    `CREATE TABLE servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      preco_carro INTEGER NOT NULL DEFAULT 0,
      preco_caminhonete INTEGER NOT NULL DEFAULT 0,
      preco_moto INTEGER NOT NULL DEFAULT 0,
      duracao_min INTEGER NOT NULL DEFAULT 30,
      ativo INTEGER NOT NULL DEFAULT 1,
      ordem_exibicao INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE ordens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL UNIQUE,
      veiculo_id INTEGER NOT NULL REFERENCES veiculos(id),
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      status TEXT NOT NULL DEFAULT 'aguardando'
        CHECK (status IN ('aguardando','lavando','acabamento','pronto','entregue','cancelada')),
      entrada_em TEXT NOT NULL,
      inicio_em TEXT,
      acabamento_em TEXT,
      pronto_em TEXT,
      entregue_em TEXT,
      funcionario_id INTEGER REFERENCES usuarios(id),
      subtotal INTEGER NOT NULL DEFAULT 0,
      desconto INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      cortesia INTEGER NOT NULL DEFAULT 0,
      observacoes TEXT,
      demo INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE ordem_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id INTEGER NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
      servico_id INTEGER REFERENCES servicos(id),
      nome TEXT NOT NULL,
      preco_unit INTEGER NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE caixa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aberto_em TEXT NOT NULL,
      fechado_em TEXT,
      valor_abertura INTEGER NOT NULL DEFAULT 0,
      valor_fechamento_informado INTEGER,
      diferenca INTEGER,
      conferencia TEXT,
      usuario_id INTEGER REFERENCES usuarios(id),
      observacoes TEXT,
      demo INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id INTEGER NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
      forma TEXT NOT NULL CHECK (forma IN ('dinheiro','pix','debito','credito','fiado')),
      valor INTEGER NOT NULL,
      pago_em TEXT NOT NULL,
      caixa_id INTEGER REFERENCES caixa(id) ON DELETE SET NULL,
      quitado_em TEXT,
      quitado_forma TEXT CHECK (quitado_forma IS NULL OR quitado_forma IN ('dinheiro','pix','debito','credito')),
      quitado_caixa_id INTEGER REFERENCES caixa(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE movimentos_caixa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caixa_id INTEGER NOT NULL REFERENCES caixa(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida','sangria','suprimento')),
      descricao TEXT,
      valor INTEGER NOT NULL,
      criado_em TEXT NOT NULL
    )`,
    `CREATE TABLE despesas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'Outros',
      valor INTEGER NOT NULL,
      data TEXT NOT NULL,
      caixa_id INTEGER REFERENCES caixa(id) ON DELETE SET NULL,
      demo INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    )`,
    `CREATE INDEX idx_veiculos_cliente ON veiculos(cliente_id)`,
    `CREATE INDEX idx_clientes_telefone ON clientes(telefone)`,
    `CREATE INDEX idx_ordens_status ON ordens(status)`,
    `CREATE INDEX idx_ordens_entrada ON ordens(entrada_em)`,
    `CREATE INDEX idx_ordens_entregue ON ordens(entregue_em)`,
    `CREATE INDEX idx_ordens_cliente ON ordens(cliente_id)`,
    `CREATE INDEX idx_ordens_veiculo ON ordens(veiculo_id)`,
    `CREATE INDEX idx_itens_ordem ON ordem_itens(ordem_id)`,
    `CREATE INDEX idx_pagamentos_ordem ON pagamentos(ordem_id)`,
    `CREATE INDEX idx_pagamentos_pago ON pagamentos(pago_em)`,
    `CREATE INDEX idx_pagamentos_caixa ON pagamentos(caixa_id)`,
    `CREATE INDEX idx_movimentos_caixa ON movimentos_caixa(caixa_id)`,
    `CREATE INDEX idx_despesas_data ON despesas(data)`,
  ],
}
