# System Guidelines: Assistente de Ponto

Extensão Chrome (Manifest V3, Vanilla JS) para calcular horário de saída a partir do saldo do banco de horas. Requisitos em `spec.md`; andamento em `TODO.md`.

## Regra de Ouro (Anti-Vibe Coding)
Nunca altere a lógica matemática de horários, o armazenamento ou a estrutura do `manifest.json` sem antes consultar o `spec.md`. Não pule etapas do `TODO.md`. Gere código limpo, semântico e focado no MVP.

## Padrões de Código (Vanilla JS)
- Use ES6+ (Arrow functions, const/let, destructuring).
- Evite bibliotecas externas (como Moment.js). Construa funções matemáticas nativas baseadas no objeto `Date` ou matemática de minutos (ex: `+01:30` = 90 minutos). Trabalhar com conversão de horas para minutos corridos é obrigatório para evitar bugs matemáticos.
- Mantenha o DOM limpo usando `document.getElementById` e `addEventListener`.
- Manipulação de Storage: Centralize as chamadas do `chrome.storage.sync` em funções assíncronas dedicadas (`async/await`). Hoje isso vive em `scripts/storage.js`; não chame `chrome.storage` direto de outros arquivos.

## Arquitetura Chrome Extension (Manifest V3)
- Use Manifest V3 estritamente.
- `background.js` atua como service worker (nada de DOM nele).
- Permissões mínimas no manifesto: `storage`. O `activeTab` pode ser incluído preparando o terreno para V2.

## Notas do projeto
- A lógica pura (parse, formatação, `calcular`) fica no topo de `popup/popup.js`, entre os marcadores `// --- lógica pura` e `// --- fim lógica pura`. Mantenha-a sem acesso a DOM ou storage para poder testá-la isolada.
- `scripts/storage.js` é compartilhado: `<script>` no popup e no `index.html`, `importScripts` no service worker. Sem DOM e sem `window` (use `globalThis`). Escolhe `chrome.storage.sync` e, se não existir, `localStorage`.
- `index.html` (raiz, GitHub Pages) espelha `popup/popup.html`: ao mudar a interface, altere os dois.

