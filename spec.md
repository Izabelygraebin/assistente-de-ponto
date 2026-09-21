# Specification: Assistente de Ponto (Chrome Extension)

## 1. Visão Geral e Problema a Resolver
O sistema oficial de ponto das empresas só atualiza o banco de horas no dia seguinte. O funcionário precisa saber *hoje* que horas ele pode ir embora, considerando atrasos de manhã, variações no horário de almoço e compensações de dias anteriores. A extensão calcula o horário exato de saída baseado nos "batimentos" reais do dia.

## 2. Decisões Arquiteturais (MVP)
- **Stack:** HTML, CSS, JavaScript (Vanilla).
- **Armazenamento:** `chrome.storage.sync` (Configurações fixas e último estado). Quando `chrome.storage.sync` não existe (página web), o mesmo código usa `localStorage` automaticamente, com a mesma interface assíncrona.
- **Formato:** Popup UI (extensão do Chrome) e, com a mesma interface e os mesmos scripts, uma página web estática (`index.html` na raiz) publicável no GitHub Pages.

## 3. Funcionalidades e Motor Matemático
1. **Configurações Base (Salvas no Storage):**
   - Carga horária diária (Ex: 08:00).
2. **Uso Diário (Inputs do Usuário):**
   - Saldo de dias anteriores (Ex: -02:37 ou +01:00). Campo com máscara `--:--` sempre visível (mesmo comportamento dos campos de hora, sem o ícone de relógio) e um botão de sinal `+`/`−` ao lado; o sinal sempre está definido e também pode ser trocado digitando `+` ou `-` no teclado. Digitando, vai até 99 horas; valores maiores (ex.: `101:00`) podem ser colados ou vir do saldo salvo.
   - Entrada 1 (Ex: 08:15).
   - Saída 1 / Almoço (Ex: 12:00).
   - Entrada 2 / Retorno (Ex: 13:45).
3. **A Lógica de Cálculo (A ordem de execução do JS):**
   - PASSO A: Calcular tempo trabalhado no 1º turno (Saída 1 - Entrada 1).
   - PASSO B: Subtrair o turno 1 da "Carga horária diária". O resultado é o saldo que o funcionário ainda precisa trabalhar hoje.
   - PASSO C: Somar a Entrada 2 com esse "saldo de horas restantes de hoje".
   - PASSO D: Pegar o horário resultante do Passo C e aplicar o "Saldo de dias anteriores" (Subtraindo se for positivo, somando se for negativo).
4. **Validação Trabalhista:**
   - Se o resultado final exigir que o funcionário trabalhe mais de 10 horas totais no dia (Carga de 8h + 2h extras limite), o sistema bloqueia o cálculo e avisa: "Cuidado: Excede o limite legal de 2 horas extras diárias".
5. **Objetivo de Hoje (modos de operação):** substitui a antiga "Estratégia". O usuário escolhe uma das opções abaixo. O saldo é um "escudo": quem tem saldo positivo não precisa ficar além do horário de costume só porque entrou atrasado.
   - **Zerar Banco Hoje** (antigo "Quitar hoje"): aplica todo o saldo no Passo D. A saída calculada é a mais cedo possível.
   - **Escolher minha saída** (horário fixo; novo): em vez de perguntar "a que horas posso sair?", o usuário informa a hora em que já pretende sair e a extensão mostra quanto isso custa ou acumula no banco. Um `input type="time"` (padrão 18:00) aparece ao lado da opção, e a opção tem um tooltip explicando isso. O cálculo é invertido:
     1. Considera a Saída 2 como o horário fixo e calcula o tempo total trabalhado hoje (1º turno + fixo − Entrada 2).
     2. Compara com a Carga horária diária: a diferença é o quanto faltou (−) ou sobrou (+) hoje.
     3. Soma essa diferença ao Saldo anterior. O resultado é o "Novo saldo para amanhã".
     - O Painel Verde mostra em destaque o horário fixo, o subtítulo "Seu saldo absorveu o atraso/extra de hoje." e o resumo "Novo saldo para amanhã: ±HH:MM".
     - A trava de 2h extras continua valendo: a jornada total não pode passar de carga + 2h.
   - **Distribuir em X dias** (antigo "Dividir em X dias"): aplica apenas saldo ÷ X por dia (X inteiro de 2 a 60).
6. **Botão "Encerrar Dia" e Retroalimentação de Saldo:**
   - O botão só aparece junto do resultado, após um cálculo bem-sucedido.
   - Ao confirmar o encerramento, o valor de "restam" (saldo que sobrou depois do saldo aplicado hoje) sobrescreve o "Saldo anterior", tanto na UI quanto no `chrome.storage.sync`. O valor é carregado em minutos absolutos a partir do cálculo, sem reler a string exibida.
   - Se o objetivo for "Distribuir em X dias", X passa a X − 1 e a nova configuração é salva. Se X − 1 = 1, a UI volta automaticamente para "Zerar Banco Hoje".
   - Se o objetivo for "Escolher minha saída", ele continua selecionado e o horário fixo é mantido; só o saldo e os horários do dia mudam.
   - Entrada 1, Saída 1 e Entrada 2 são limpos (UI e storage) para o dia seguinte.

## 4. UI e Usabilidade
- O campo "Saída 2" (Hora final) não é um input, ele é o grande destaque da tela (O Resultado).
- Todos os campos de hora (HH:MM) devem converter nativamente para minutos absolutos antes do cálculo para evitar bugs de base 60.
- **Transparência do cálculo:** abaixo da Saída 2, o card de resultado mostra a "Saída normal sem saldo" (a Saída Base: resultado do Passo C, ou seja, a saída de hoje se nenhum saldo fosse aplicado, já considerando atraso na entrada) e o "Saldo aplicado" com o que resta ("restam"). Ex.: `18:18` / `Saída normal sem saldo: 19:00` / `Saldo aplicado: +00:42 (restam +00:41)`.
- **Horas trabalhadas no dia:** o card de resultado mostra, só como texto, o total trabalhado no dia se a pessoa sair na Saída 2 (1º turno + 2º turno). Ex.: `Horas trabalhadas no dia: 07:00`. Vale para os três objetivos.
- **Sinais:** saldo positivo (horas a favor) faz a Saída 2 ficar antes da Saída Base; saldo negativo (horas devidas) faz ficar depois.
- **Campos Saldo anterior, Entrada 1, Saída 1 e Entrada 2:** cada um é composto de dois segmentos (horas e minutos) com a máscara `--:--` sempre visível, mesmo durante a digitação.
  - Digitando só números, o cursor avança das horas para os minutos sozinho. Um primeiro dígito que não pode iniciar uma hora válida é completado (ex.: `3` vira `03` nos horários; minutos maiores que 59 viram 59).
  - `Backspace`/`Delete`: apaga o segmento atual. Com os minutos já vazios, o próximo `Backspace`/`Delete` volta o cursor para as horas (na prática, dois toques quando os minutos estão preenchidos), sem precisar da seta.
  - `:` avança para os minutos; as setas `←`/`→` também alternam entre os segmentos.
  - Colar aceita `0830`, `08:30` (e, no saldo, `+`/`-` na frente).
  - Carga horária diária e o horário de "Escolher minha saída" continuam como campo de hora nativo do navegador.
- **Altura:** o popup deve caber em cerca de 500px, sem barra de rolagem (o Chrome limita popups a 600px).

## 5. Estrutura de Diretórios
Mantida da versão anterior da spec.

```
/
|-- manifest.json
|-- index.html (versão web estática, espelha popup/popup.html)
|-- /popup
|   |-- popup.html
|   |-- popup.css
|   |-- popup.js
|-- /scripts
|   |-- background.js (Service Worker)
|   |-- content.js (Preparação para V2)
|-- /icons
```

---

## Notas (não fazem parte da spec)

Decisões assumidas na implementação onde a spec não define o comportamento. Revisar antes de alterar.

- **Removidos do MVP:** "Registrar jornada" e o histórico, pois a nova spec não os prevê. Ficam fora até serem pedidos de novo.
- **Objetivo de Hoje (seção 3, item 5):** os valores internos continuam `hoje`, `fixo` e `dividir`. Em "Distribuir em X dias" a parcela é saldo ÷ X, arredondada ao minuto (a sobra continua no saldo). O saldo anterior é atualizado pelo botão "Encerrar Dia" (seção 3, item 6); o usuário ainda pode corrigi-lo à mão. Como a jornada total = carga − saldo aplicado, distribuir reduz o extra do dia, e o erro de limite sugere o número mínimo de dias (⌈|saldo| ÷ 2h⌉).
- **"Escolher minha saída" na implementação:** equivale a aplicar hoje exatamente `Saída Base − horário fixo` do saldo, então o "Novo saldo para amanhã" = saldo + (tempo trabalhado hoje − carga). Não depende do sinal do saldo: quem sai mais cedo que a Saída Base gasta saldo, e quem sai mais tarde acumula (inclusive ficando com saldo negativo maior). Se o limite de 2h for excedido, o erro indica até que horas é possível sair. O horário fixo deve ser depois da Entrada 2. Nesse modo o card mostra o subtítulo e o novo saldo no lugar das linhas "Saída normal sem saldo" e "Saldo aplicado".
- **Estado salvo:** objetivo, X e horário fixo (padrão 18:00) ficam no storage.
- **Content scripts (Ahgora/Pontomais):** `manifest.json` mantido como estava (ainda declara `content_scripts`, com `content.js` vazio).
- **Limite:** bloqueia se a jornada total (1º turno + 2º turno) for **maior que carga + 2h**. Exatamente carga + 2h (10h com carga de 8h) é permitido. Como o Passo D torna a jornada total = carga − saldo, o exemplo de saldo `-02:37` da spec (jornada de 10:37) é bloqueado.
- **Casos sem regra na spec (bloqueiam com mensagem):**
  - Saída 1 não posterior à Entrada 1;
  - Entrada 2 anterior à Saída 1;
  - Saída 2 calculada igual ou anterior à Entrada 2 (jornada já cumprida no 1º turno);
  - Saída 2 calculada após 23:59.
- **Storage** (`chrome.storage.sync`): carga horária (configuração fixa) e, como último estado, saldo, Entrada 1, Saída 1, Entrada 2, objetivo, X e horário fixo. Grava após um cálculo bem-sucedido e ao encerrar o dia.
- **Arquivo adicional:** `scripts/storage.js` centraliza o acesso ao storage; usado pelo popup e pelo `index.html` (`<script>`) e pelo service worker (`importScripts`). É ele que escolhe o backend: `chrome.storage.sync` se existir; senão `localStorage` (uma chave JSON) e, se nem o `localStorage` estiver disponível (navegação privada, bloqueio), memória da página.
- **Versão web (GitHub Pages):** `index.html` na raiz repete o markup de `popup/popup.html` e carrega `popup/popup.css`, `scripts/storage.js` e `popup/popup.js`. Como o markup é duplicado, qualquer mudança na interface deve ser feita nos dois arquivos. Na web os dados ficam só no navegador de quem usa (`localStorage`), sem sincronizar entre dispositivos.





