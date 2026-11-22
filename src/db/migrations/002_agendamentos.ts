import type { Migration } from './index'

/*
 * Agenda de horários. O agendamento guarda uma cópia dos dados digitados (nome, telefone, placa,
 * serviços com preço) porque o cliente pode ainda não ter cadastro: o cadastro e a ordem só são
 * criados quando ele chega ("Chegou → fila"). `ordem_id` liga o agendamento à ordem gerada.
 */
export const m002_agendamentos: Migration = {
  version: 2,
  nome: 'agendamentos',
  statements: [
    `CREATE TABLE agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_hora TEXT NOT NULL,
      duracao_min INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'agendado'
        CHECK (status IN ('agendado','confirmado','chegou','cancelado','faltou')),
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
      nome TEXT NOT NULL,
      telefone TEXT,
      placa TEXT,
      modelo TEXT,
      cor TEXT,
      tipo TEXT NOT NULL DEFAULT 'carro' CHECK (tipo IN ('carro','moto','caminhonete','van')),
      servicos TEXT NOT NULL DEFAULT '[]',
      total INTEGER NOT NULL DEFAULT 0,
      observacoes TEXT,
      ordem_id INTEGER REFERENCES ordens(id) ON DELETE SET NULL,
      criado_em TEXT NOT NULL,
      demo INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX idx_agendamentos_data ON agendamentos(data_hora)`,
    `CREATE INDEX idx_agendamentos_status ON agendamentos(status)`,
  ],
}
