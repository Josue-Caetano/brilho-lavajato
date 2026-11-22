# Brilho — sistema para lava-jato

Aplicativo de desktop para Windows que substitui a planilha do lava-jato: **fila de carros**, **agenda de horários**, **clientes e veículos**, **fidelidade**, **caixa**, **relatórios**, **WhatsApp**, **comprovante** e **backup**. Funciona **sem internet**. A internet só é usada para abrir o WhatsApp.

Versão **1.1.0**.

---

## Sumário

1. [Instalar no computador do balcão](#1-instalar-no-computador-do-balcão)
2. [Primeiro uso](#2-primeiro-uso)
3. [Backup e restauração](#3-backup-e-restauração)
4. [Rodar em desenvolvimento](#4-rodar-em-desenvolvimento)
5. [Gerar uma nova versão (instalador)](#5-gerar-uma-nova-versão-instalador)
6. [Como o projeto é organizado](#6-como-o-projeto-é-organizado)
7. [Decisões técnicas](#7-decisões-técnicas)

---

## 1. Instalar no computador do balcão

1. Baixe o instalador `Brilho_1.1.0_x64-setup.exe` (recomendado) ou `Brilho_1.1.0_x64_pt-BR.msi`.
   Ele fica no GitHub, em **Releases** ou em **Actions → Instalador Windows → Artifacts** (veja a seção 5).
2. Dê dois cliques e siga o instalador. O `.exe` instala só para o usuário atual e não pede senha de administrador.
3. O atalho **Brilho** aparece no Menu Iniciar e na Área de Trabalho.

> **Requisitos:** Windows 10 ou 11 (64 bits). O WebView2, que o Brilho usa para desenhar a tela, já vem no Windows 10/11 atualizado. Se faltar, o instalador baixa sozinho, e nesse momento é preciso ter internet.

**Onde ficam os dados?** Em `%APPDATA%\br.com.brilho.lavajato\brilho.db`, um único arquivo SQLite. Desinstalar o app **não** apaga esse arquivo.

## 2. Primeiro uso

Na primeira vez, um assistente pede:

1. **Seu nome e PIN de 4 dígitos.** Você é o **dono** e vê tudo, inclusive o faturamento.
2. **Os dados do lava-jato.** Aparecem no comprovante e nas mensagens.
3. **Os serviços e preços** por tipo de veículo. Dá para mudar depois em **Serviços**.
4. **Se quer carregar dados de demonstração:** 15 clientes fictícios e 30 dias de histórico. Eles podem ser removidos com um clique em **Configurações → Demonstração**.

Depois disso:

- **Funcionários:** crie em **Configurações → Usuários e PINs**. Eles operam fila, clientes e caixa, mas não veem relatórios nem os valores do painel.
- **Planilha antiga:** use **Configurações → Importar planilha**. Escolha o `.xlsx` ou `.csv`, confira o mapeamento das colunas e importe. As linhas com problema (placa inválida, nome vazio, placa repetida) aparecem num relatório que você pode baixar.
- **Impressora térmica:** em **Configurações → Impressão**, escolha 80 mm ou 58 mm e use **Imprimir teste**. Na janela de impressão, selecione a impressora térmica e marque margens "Nenhuma".

### Atalhos de teclado

| Tecla            | Ação                                         |
| ---------------- | -------------------------------------------- |
| `F2` ou `Ctrl+N` | Novo carro                                   |
| `F3`             | Novo agendamento                             |
| `Ctrl+K`         | Busca global (placa, nome, telefone e ações) |
| `F1`             | Ajuda com todos os atalhos                   |
| `Enter`          | Confirma o formulário aberto                 |
| `Esc`            | Fecha janelas                                |

### Agenda de horários

Na tela **Agenda** (ou com `F3` de qualquer lugar):

- **Para marcar um horário:** digite a placa. Se o carro já veio antes, o cliente é preenchido sozinho. Depois escolha o serviço, o dia e o horário. Os horários lotados aparecem riscados, mas ainda dá para encaixar.
- **Confirmação e lembrete:** depois de marcar, o botão do WhatsApp manda a confirmação. No dia do horário, o mesmo botão manda o lembrete.
- **Quando o cliente chegar:** clique em **Chegou → fila**. O cadastro (se for cliente novo) e a ordem são criados na hora, com os serviços agendados.
- **Outras ações no menu do cartão:** marcar como confirmado, remarcar, registrar falta ou cancelar. Horário cancelado ou com falta libera a vaga.
- **Visões:** **Dia** (com o horário atual em destaque) e **Semana**. O Painel mostra a **Agenda de hoje**, e o menu lateral mostra quantos clientes ainda são esperados.
- **Configuração:** em **Configurações → Agenda**, defina o horário de funcionamento, o intervalo entre horários, quantos carros cabem ao mesmo tempo e os dias fechados. As mensagens ficam em **Configurações → WhatsApp** (variáveis extras: `{data}`, `{hora}`, `{servicos}`).

## 3. Backup e restauração

Em **Configurações → Backup**:

- **Escolha uma pasta segura:** um pen drive ou a pasta do Google Drive/OneDrive instalada no computador. Assim o backup sai da máquina.
- Com o **backup automático** ligado, o Brilho faz uma cópia **ao fechar o app** e **a cada X horas** (padrão: 4 h). Os **30 arquivos mais recentes** ficam guardados (`brilho-backup-AAAA-MM-DD_HH-MM-SS.db`) e os mais antigos são apagados.
- **Fazer backup agora** gera uma cópia na hora.
- O indicador no rodapé do menu lateral fica **laranja** se o backup não estiver configurado ou se o último tiver mais de 24 h.

**Para restaurar:** em **Configurações → Backup → Restaurar backup**, escolha o arquivo `.db`. Antes de substituir, o Brilho guarda o banco atual como `brilho.antes-da-restauracao.db`, na mesma pasta dos dados, e reinicia sozinho.

**Para mudar de computador:** instale o Brilho no computador novo e restaure o backup mais recente.

## 4. Rodar em desenvolvimento

### Pré-requisitos (Windows)

| Ferramenta                | Como instalar                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Node.js LTS (22+)         | https://nodejs.org (instalador "LTS") ou `winget install OpenJS.NodeJS.LTS`                                    |
| Rust                      | `winget install Rustlang.Rustup` e depois `rustup default stable`                                              |
| Microsoft C++ Build Tools | https://visualstudio.microsoft.com/visual-cpp-build-tools/ → marque **"Desenvolvimento para desktop com C++"** |
| WebView2                  | Já vem no Windows 10/11. Se faltar: https://developer.microsoft.com/microsoft-edge/webview2/                   |

No Linux também funciona. Instale `libwebkit2gtk-4.1-dev librsvg2-dev libayatana-appindicator3-dev build-essential libssl-dev`.

### Comandos

```bash
npm install          # instala as dependências
npm run tauri:dev    # abre o app desktop com recarga automática
npm run dev          # só a interface no navegador (http://localhost:1420), com banco SQLite em memória
npm run check        # lint + typecheck + testes (rode antes de cada commit)
npm test             # só os testes (Vitest)
npm run format       # formata o código (Prettier)
```

> **Modo navegador** (`npm run dev`): o app roda inteiro no navegador com SQLite em WebAssembly (sql.js), salvo no `localStorage`. Serve para desenvolver e demonstrar a interface. Backup, restauração e impressão funcionam de forma simplificada nesse modo.

## 5. Gerar uma nova versão (instalador)

1. Atualize o número da versão nos três arquivos (mesmo valor):
   - `package.json` → `"version"`
   - `src-tauri/tauri.conf.json` → `"version"`
   - `src-tauri/Cargo.toml` → `version`
2. Rode `npm run check` e confirme que tudo passa.
3. Gere o instalador. Há dois caminhos:
   - **No GitHub (recomendado):** crie e envie uma tag:
     ```bash
     git tag v1.0.1
     git push origin v1.0.1
     ```
     O workflow **Instalador Windows** (`.github/workflows/build-windows.yml`) roda os testes, compila no Windows e cria um **rascunho de Release** com o `.msi` e o `.exe`. Também dá para rodar manualmente em **Actions → Instalador Windows → Run workflow** e baixar o resultado em **Artifacts**.
   - **No seu Windows:** `npm run tauri:build`. Os instaladores ficam em `src-tauri/target/release/bundle/msi/` e `.../bundle/nsis/`.
4. Instale por cima da versão anterior. Os dados são preservados.

### Atualização automática (opcional, já preparada)

O plugin `updater` já está registrado. Para ativar:

1. Gere as chaves: `npx tauri signer generate -w ~/.tauri/brilho.key`.
2. Em `src-tauri/tauri.conf.json`, preencha `plugins.updater.pubkey` com a chave pública e `plugins.updater.endpoints` com a URL do `latest.json`. Por exemplo: `https://github.com/<usuario>/<repo>/releases/latest/download/latest.json`.
3. Mude `bundle.createUpdaterArtifacts` para `true` e configure os segredos `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` no GitHub.

### Ícone

O ícone fica em `src-tauri/app-icon.svg`. Para trocá-lo, edite o SVG (ou use um PNG de 1024×1024) e rode `npx tauri icon src-tauri/app-icon.svg -o src-tauri/icons`.

## 6. Como o projeto é organizado

```
src/
  app/              rotas, layout (menu lateral e cabeçalho), modais globais, atalhos, backup automático
  components/ui/    componentes base no estilo shadcn/ui (botão, card, dialog, select, tabs…)
  components/       peças do produto: chip de placa, contador animado, campo de dinheiro
  features/         uma pasta por tela: painel, fila, novo-carro, pagamento, clientes,
                    servicos, caixa, relatorios, configuracoes, busca, ajuda, auth, comprovante
  db/
    migrations/     migrations versionadas (nunca edite uma publicada: crie a próxima)
    repositories/   todo o SQL do app, isolado por assunto (com testes)
    seed.ts         dados de demonstração (marcados com demo = 1)
  lib/              regras de negócio puras e testadas: dinheiro, placa, telefone,
                    desconto/troco, fidelidade, clientes sumidos, fechamento de caixa,
                    WhatsApp, backup, importação de planilha, exportação para Excel
src-tauri/          app Rust: plugins (sql, fs, dialog, shell, store, updater) e comandos
                    de transação, backup e restauração
```

**Stack:** Tauri 2 · React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · componentes estilo shadcn/ui (Radix) · lucide-react · SQLite (tauri-plugin-sql) · Zustand · TanStack Query · React Router · react-hook-form + zod · Recharts · dnd-kit · date-fns (pt-BR, semana começando no domingo) · sonner · SheetJS · Vitest + Testing Library · ESLint + Prettier.

## 7. Decisões técnicas

- **Dinheiro em centavos** (`INTEGER`) em todo o banco e nas regras. A formatação para `R$ 1.240,00` só acontece na tela.
- **Datas em ISO 8601 no horário local**, sem fuso (`2026-10-18T14:30:00`). Assim dá para agrupar por dia com `date()` sem conversões; o Brasil não tem mais horário de verão.
- **Migrations em TypeScript.** O mesmo SQL roda no app (tauri-plugin-sql) e nos testes/navegador (sql.js). Cada migration é aplicada numa transação e registrada em `schema_migrations`.
- **Transações via comando Rust (`db_transaction`).** O pool do tauri-plugin-sql usa várias conexões, então `BEGIN`/`COMMIT` em chamadas separadas não é seguro. As operações que mexem em várias tabelas (entregar e cobrar, cadastro rápido, fechar caixa, importar planilha, dados de demonstração) vão para o Rust numa única transação. Um parâmetro `{"$ref": n}` usa o id inserido pelo comando `n`.
- **Backup com `VACUUM INTO`.** Gera uma cópia consistente mesmo com o app aberto.
- **Ajustes no modelo sugerido**, todos justificados em `src/db/migrations/001_inicial.ts`:
  - `ordens.subtotal`, para relatar descontos;
  - `ordens.acabamento_em`, para medir o tempo da secagem;
  - `ordens.cortesia`, que é a base da fidelidade calculada;
  - `ordem_itens.nome`, para que o histórico não mude quando um serviço é renomeado;
  - `pagamentos.caixa_id` e `quitado_*`, para a conferência do caixa e a quitação de fiado;
  - `despesas.caixa_id`, para a despesa paga com dinheiro da gaveta;
  - `clientes.aniversario` (MM-DD);
  - coluna `demo` nos registros fictícios;
  - van usa o preço de caminhonete.
- **Fidelidade:** a cada N lavagens entregues e pagas, a próxima é grátis. A lavagem grátis zera o serviço principal (o mais caro da ordem) e fica marcada como `cortesia`.
- **SheetJS:** o npm só tem a versão 0.18.5, que tem alertas de segurança conhecidos (afetam a leitura de planilhas de origem desconhecida). Para a versão mais nova, instale pelo CDN oficial: `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.
- **PDF dos relatórios:** o botão **PDF** abre a impressão com um layout A4 próprio. No Windows, escolha **"Microsoft Print to PDF"** para salvar.

---

## Autor

Desenvolvido por [Josue-Caetano](https://github.com/Josue-Caetano), com auxílio de inteligência artificial no desenvolvimento.
