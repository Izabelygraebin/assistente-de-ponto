// Service Worker (MV3) — sem acesso a DOM.
// Por enquanto só garante valores padrão no storage na instalação.
// Na V2 também receberá mensagens do content.js (saldo lido do sistema de ponto).

importScripts("storage.js");

chrome.runtime.onInstalled.addListener(inicializarPadroes);

// V2: content.js enviará { tipo: "saldo-lido", saldoMin } e gravaremos aqui.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.tipo === "saldo-lido" && Number.isInteger(msg.saldoMin)) {
    salvarSaldo(msg.saldoMin);
  }
});
