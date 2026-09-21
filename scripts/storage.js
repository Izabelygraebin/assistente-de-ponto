// Acesso centralizado ao armazenamento.
// Carregado pelo popup e pelo index.html (<script>) e pelo service worker (importScripts) — sem DOM
// e sem `window` aqui (use `globalThis`, que existe também no service worker).
//
// Backend, escolhido automaticamente:
//   1. chrome.storage.sync  — quando roda como extensão do Chrome;
//   2. localStorage         — quando roda como página web (ex.: GitHub Pages);
//   3. memória da página    — se nem o localStorage estiver disponível (navegação privada, bloqueio).
// Os três têm a mesma interface assíncrona: get(padrões | null) e set(objeto).

const CHAVE_LOCAL = "assistente-de-ponto"; // no localStorage, tudo fica em uma chave, como JSON

const criarArmazenamentoLocal = () => {
  let memoria = null; // cópia em memória: mantém o app funcionando mesmo se o localStorage falhar

  const ler = () => {
    try {
      return JSON.parse(globalThis.localStorage.getItem(CHAVE_LOCAL)) ?? {};
    } catch {
      return {}; // sem localStorage, sem chave ou JSON inválido
    }
  };
  const dados = () => (memoria ??= ler());

  return {
    // Igual ao chrome.storage: get(null) devolve tudo o que foi salvo; get(padrões) mistura os padrões.
    get: async (padroes) => (padroes === null ? { ...dados() } : { ...padroes, ...dados() }),
    set: async (novos) => {
      memoria = { ...dados(), ...novos };
      try {
        globalThis.localStorage.setItem(CHAVE_LOCAL, JSON.stringify(memoria));
      } catch {
        // sem persistência: os dados valem só até fechar a página
      }
    },
  };
};

const armazenamento = globalThis.chrome?.storage?.sync ?? criarArmazenamentoLocal();

const ESTADO_PADRAO = {
  cargaHoraria: "08:00", // configuração fixa (HH:MM)
  saldoMin: null,        // saldo de dias anteriores, em minutos (+/-)
  entrada1: "",          // último estado dos batimentos do dia (HH:MM)
  saida1: "",
  entrada2: "",
  estrategia: "hoje",    // Objetivo de Hoje: "hoje" | "fixo" | "dividir"
  dias: 2,               // usado quando estrategia === "dividir"
  saidaFixa: "18:00",    // usado quando estrategia === "fixo" (HH:MM)
};

const carregarEstado = () => armazenamento.get(ESTADO_PADRAO);

// Grava os padrões só nas chaves que ainda não existem.
const inicializarPadroes = async () => {
  const atual = await armazenamento.get(null);
  await armazenamento.set({ ...ESTADO_PADRAO, ...atual });
};

const salvarEstado = ({ cargaHoraria, saldoMin, entrada1, saida1, entrada2, estrategia, dias, saidaFixa }) =>
  armazenamento.set({ cargaHoraria, saldoMin, entrada1, saida1, entrada2, estrategia, dias, saidaFixa });

const salvarSaldo = (saldoMin) => armazenamento.set({ saldoMin });
