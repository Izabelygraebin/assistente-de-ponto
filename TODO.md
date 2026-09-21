# Plano de Ação - MVP (adaptado à nova spec)

- [x] **Tarefa 1: O Esqueleto (Manifest e HTML).** `manifest.json` (V3), estrutura de pastas e `popup.html` com Carga horária, Saldo anterior, Entrada 1, Saída 1, Entrada 2 e botão de cálculo.
- [x] **Tarefa 2: O Motor Matemático (Lógica pura).** Conversão HH:MM ⇄ minutos e `calcular` com os passos A–D da spec (`popup/popup.js`).
- [x] **Tarefa 3: Travas Trabalhistas e UI.** Bloqueio quando a jornada total passa de carga + 2h, com a mensagem da spec; resultado "Saída 2" em destaque.
- [x] **Tarefa 4: Armazenamento (Storage).** Carga horária e último estado em `chrome.storage.sync` (`scripts/storage.js`), gravados após cálculo bem-sucedido e restaurados ao reabrir o popup.
- [x] **Extra: Dividir em X dias.** Estratégia "Quitar hoje" ou "Dividir em X dias" para o saldo anterior (aplica saldo ÷ X no Passo D).
- [x] **Tarefa 5: Estilização básica.** `popup/popup.css`, tema escuro (variáveis em `:root`, grid para os campos, card verde de resultado).
- [x] **Tarefa 6: Lógica de Encerrar Dia e Sincronização de Storage.** Botão "Encerrar Dia" (só após cálculo bem-sucedido): "restam" sobrescreve o Saldo anterior (UI e storage, em minutos); em "Dividir em X dias" reduz X em 1 e, ao chegar em 1, volta para "Quitar hoje"; limpa Entrada 1, Saída 1 e Entrada 2 (UI e storage).

- [x] **Tarefa 7: Objetivo de Hoje.** Estratégia vira "Objetivo de hoje": Zerar banco hoje, Sair em horário fixo (cálculo inverso, novo saldo para amanhã) e Distribuir em X dias.
- [x] **Tarefa 8: Campo Saldo com máscara e "Escolher minha saída".** Saldo anterior com máscara `--:--` e botão de sinal +/−; opção "Sair em horário fixo" renomeada para "Escolher minha saída", com tooltip.
- [x] **Tarefa 9: Campos de hora segmentados e horas trabalhadas.** Saldo, Entrada 1, Saída 1 e Entrada 2 com máscara `--:--` sempre visível (dois segmentos), sinal do saldo por teclado (`+`/`-`), Backspace/Delete voltando dos minutos para as horas, alinhamento do botão de sinal e linha "Horas trabalhadas no dia" no resultado.
- [x] **Tarefa 10: Versão web estática (GitHub Pages).** Camada de armazenamento com fallback automático `chrome.storage.sync` → `localStorage` (em `scripts/storage.js`) e `index.html` na raiz com a mesma interface e scripts.
- [x] **Ajustes de UI/UX:** popup compacto (≈500px com o resultado visível, sem scrollbar) e "Saída normal sem saldo" (Saída Base) no card de resultado.

## Testes automatizados (fora do Chrome)
- [x] Lógica de cálculo (passos A–D, limite, casos de borda).
- [x] Popup completo em jsdom com `chrome.storage` simulado.

## Pendente
- [ ] Teste manual no Chrome real (carregar sem compactação em `chrome://extensions`).
- [ ] V2: leitura automática do saldo via `content.js` (Ahgora/Pontomais).
