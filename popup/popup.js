// --- lógica pura ---------------------------------------------------------
// Todos os tempos são inteiros em minutos.

const LIMITE_EXTRA_MIN = 120; // trava trabalhista: no máximo 2h extras por dia
const MSG_LIMITE = "Cuidado: Excede o limite legal de 2 horas extras diárias.";

function parseSaldo(texto) {
  const m = /^([+-])(\d{1,3}):([0-5]\d)$/.exec(texto.trim());
  if (!m) return null;
  const min = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === "-" && min > 0 ? -min : min; // "-00:00" é o mesmo que "+00:00"
}

// --- campos de hora segmentados (horas / minutos) ---

// Divide um texto digitado/colado em { h, m } (só dígitos).
// Com ":" respeita a separação; sem ":" usa a posição (0830 → 08/30; 10100 → 101/00).
function dividirHora(texto) {
  const so = (s) => s.replace(/\D/g, "");
  if (texto.includes(":")) {
    const [h, m] = texto.split(":");
    return { h: so(h).slice(0, 3), m: so(m).slice(0, 2) };
  }
  const digitos = so(texto).slice(0, 5);
  const horas = digitos.length === 5 ? 3 : 2;
  return { h: digitos.slice(0, horas), m: digitos.slice(horas) };
}

// O último +/− do texto colado (ou null se não houver).
function sinalDoTexto(texto) {
  const sinais = texto.match(/[+\-−–]/g);
  if (!sinais) return null;
  return /[-−–]/.test(sinais[sinais.length - 1]) ? "-" : "+";
}

// "HH:MM" quando os dois segmentos estão completos; senão "" (como um campo de hora nativo).
function juntarHora(h, m) {
  return h !== "" && m.length === 2 ? `${h.padStart(2, "0")}:${m}` : "";
}

// Normaliza o que foi digitado em um segmento. `max` é o maior valor permitido
// (23 para horas de relógio, 59 para minutos; null = sem limite). `avancar` = segmento completo.
function normalizarSegmento(bruto, max) {
  let valor = bruto.replace(/\D/g, "").slice(0, 2);
  if (max !== null) {
    if (valor.length === 1 && Number(valor) * 10 > max) valor = "0" + valor; // "3" → "03": não há 3x
    if (valor.length === 2 && Number(valor) > max) valor = String(max);      // "75" → "59"
  }
  return { valor, avancar: valor.length === 2 };
}
function parseHora(texto) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(texto.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function dois(n) {
  return String(n).padStart(2, "0");
}

function formatDuracao(min) {
  const abs = Math.abs(min);
  return `${dois(Math.floor(abs / 60))}:${dois(abs % 60)}`;
}

function formatSaldo(min) {
  return (min < 0 ? "-" : "+") + formatDuracao(min);
}

// Parcela do saldo aplicada hoje: tudo em "hoje", ou saldo ÷ dias (arredondado ao minuto).
// A sobra do arredondamento permanece no saldo.
function saldoAplicado(saldoMin, estrategia, dias) {
  if (estrategia !== "dividir") return saldoMin;
  return Math.sign(saldoMin) * Math.round(Math.abs(saldoMin) / dias);
}

/**
 * Calcula a Saída 2 (spec.md, seção 3).
 * Sinais do saldo (a saída é sempre `saidaBase − aplicado`):
 *   saldo POSITIVO = horas a favor  → a saída DIMINUI (sai mais cedo que a saída base);
 *   saldo NEGATIVO = horas devidas  → a saída AUMENTA (sai mais tarde que a saída base).
 * `saidaBaseMin` é a saída de hoje SEM aplicar saldo (Passo C), já considerando o atraso da manhã.
 * `estrategia` (Objetivo de Hoje, spec.md seção 3, item 5):
 *   "hoje"    — Zerar Banco Hoje: aplica o saldo inteiro;
 *   "dividir" — Distribuir em X dias: aplica saldo ÷ `dias`;
 *   "fixo"    — Sair em horário fixo (`saidaFixaMin`): cálculo inverso. A parcela aplicada é a
 *               diferença entre a saída base e o horário escolhido, e o "novo saldo" é
 *               saldo + (tempo trabalhado hoje − carga) = saldo − aplicado.
 */
function calcular({
  cargaMin, saldoMin, entrada1Min, saida1Min, entrada2Min,
  estrategia = "hoje", dias = 1, saidaFixaMin = null,
}) {
  if (saida1Min <= entrada1Min) {
    return { ok: false, erro: "A Saída 1 deve ser depois da Entrada 1." };
  }
  if (entrada2Min < saida1Min) {
    return { ok: false, erro: "A Entrada 2 deve ser depois da Saída 1." };
  }
  if (estrategia === "fixo" && saidaFixaMin <= entrada2Min) {
    return { ok: false, erro: "O horário de saída deve ser depois da Entrada 2." };
  }

  const turno1Min = saida1Min - entrada1Min;          // PASSO A
  const restanteMin = cargaMin - turno1Min;           // PASSO B
  const saidaBaseMin = entrada2Min + restanteMin;     // PASSO C
  const aplicadoMin = estrategia === "fixo"
    ? saidaBaseMin - saidaFixaMin
    : saldoAplicado(saldoMin, estrategia, dias);
  const saida2Min = saidaBaseMin - aplicadoMin;       // PASSO D

  const totalMin = turno1Min + (saida2Min - entrada2Min);
  if (totalMin > cargaMin + LIMITE_EXTRA_MIN) {
    const dica = estrategia === "fixo"
      ? `Saia até ${formatDuracao(saidaBaseMin + LIMITE_EXTRA_MIN)}.`
      : `Divida o saldo em pelo menos ${Math.ceil(-saldoMin / LIMITE_EXTRA_MIN)} dias.`;
    return { ok: false, erro: `${MSG_LIMITE} ${dica}` };
  }
  if (saida2Min <= entrada2Min) {
    return { ok: false, erro: "Com esse saldo, a jornada já foi cumprida no 1º turno." };
  }
  if (saida2Min >= 24 * 60) {
    return { ok: false, erro: "A saída calculada cai fora do mesmo dia (após 23:59)." };
  }

  return {
    ok: true, turno1Min, restanteMin, saidaBaseMin, saida2Min, totalMin,
    aplicadoMin, saldoRestanteMin: saldoMin - aplicadoMin,
  };
}

/**
 * Estado que vale a partir do dia seguinte ao "Encerrar Dia" (spec.md, seção 3, item 5).
 * `saldoRestanteMin` vem do cálculo, em minutos: nunca é relido da string exibida.
 * "dividir" com X dias passa a X − 1; ao chegar em 1 dia, volta para "hoje".
 * "fixo" continua "fixo" (o horário fixo é mantido à parte, no campo próprio).
 */
function encerrarDia({ saldoRestanteMin, estrategia, dias }) {
  if (estrategia === "dividir" && dias - 1 >= 2) {
    return { saldoMin: saldoRestanteMin, estrategia: "dividir", dias: dias - 1 };
  }
  if (estrategia === "fixo") {
    return { saldoMin: saldoRestanteMin, estrategia: "fixo", dias: 2 };
  }
  return { saldoMin: saldoRestanteMin, estrategia: "hoje", dias: 2 };
}

// --- fim lógica pura -----------------------------------------------------

const $ = (id) => document.getElementById(id);
const campos = {
  carga: $("carga"),
  saldo: $("saldo"),
  saldoSinal: $("saldoSinal"),
  entrada1: $("entrada1"),
  saida1: $("saida1"),
  entrada2: $("entrada2"),
  dias: $("dias"),
  saidaFixa: $("saidaFixa"),
  estrategias: document.querySelectorAll('input[name="estrategia"]'),
};

// Campo de hora HH:MM feito de dois <input> (horas e minutos): a máscara "--" fica sempre visível,
// mesmo durante a digitação. Expõe `.value` ("HH:MM", ou "" se incompleto), como um campo de hora nativo.
function ativarCampoHora(campo) {
  const [hh, mm] = campo.querySelectorAll("input");
  const maxHoras = campo.dataset.maxHoras ? Number(campo.dataset.maxHoras) : null;

  Object.defineProperty(campo, "value", {
    get: () => juntarHora(hh.value, mm.value),
    set: (texto) => {
      const { h, m } = dividirHora(texto);
      hh.value = h;
      mm.value = m;
    },
  });

  const irPara = (input) => { input.focus(); input.select(); };
  const notificar = (input) => input.dispatchEvent(new Event("input", { bubbles: true }));

  [[hh, maxHoras, mm], [mm, 59, null]].forEach(([input, max, proximo]) => {
    // Só números; ao completar o segmento das horas, o cursor passa sozinho para os minutos.
    input.addEventListener("input", () => {
      const { valor, avancar } = normalizarSegmento(input.value, max);
      input.value = valor;
      if (avancar && proximo) irPara(proximo);
    });
    input.addEventListener("blur", () => { if (input.value.length === 1) input.value = "0" + input.value; });

    // Ao entrar no segmento, seleciona o conteúdo (digitar substitui), inclusive quando entra por clique.
    let clicouParaFocar = false;
    input.addEventListener("focus", () => input.select());
    input.addEventListener("mousedown", () => { clicouParaFocar = document.activeElement !== input; });
    input.addEventListener("mouseup", (e) => {
      if (clicouParaFocar) { e.preventDefault(); clicouParaFocar = false; }
    });

    input.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl+V, Ctrl+A etc. seguem o padrão
      const emHoras = input === hh;
      if (e.key === "Backspace" || e.key === "Delete") {
        // Apaga o segmento; com os minutos já vazios, volta para as horas (sem usar a seta).
        e.preventDefault();
        if (input.value !== "") { input.value = ""; notificar(input); }
        else if (!emHoras) irPara(hh);
      } else if (emHoras && [":", ".", ",", " "].includes(e.key)) {
        e.preventDefault();
        irPara(mm);
      } else if (e.key === "ArrowRight" && emHoras && input.selectionEnd === input.value.length) {
        e.preventDefault();
        irPara(mm);
      } else if (e.key === "ArrowLeft" && !emHoras && input.selectionStart === 0) {
        e.preventDefault();
        irPara(hh);
      } else if (e.key.length === 1 && !/\d/.test(e.key)) {
        e.preventDefault(); // só números
      }
    });
  });

  campo.addEventListener("paste", (e) => {
    e.preventDefault();
    campo.value = e.clipboardData ? e.clipboardData.getData("text") : "";
    campo.dispatchEvent(new Event("input", { bubbles: true })); // no campo (não no segmento), para não cortar "101" horas
  });
}

[campos.saldo, campos.entrada1, campos.saida1, campos.entrada2].forEach(ativarCampoHora);

function estrategiaSelecionada() {
  return document.querySelector('input[name="estrategia"]:checked').value;
}

// Cada objetivo mostra/habilita só o campo que lhe pertence.
function atualizarCamposEstrategia() {
  const estrategia = estrategiaSelecionada();
  campos.dias.disabled = estrategia !== "dividir";
  campos.saidaFixa.hidden = estrategia !== "fixo";
}

function selecionarEstrategia(valor) {
  document.querySelector(`input[name="estrategia"][value="${valor}"]`).checked = true;
  atualizarCamposEstrategia();
}

// Saldo anterior: o sinal vive no botão (data-sinal) e o HH:MM no campo de hora segmentado.
const sinalSaldo = () => campos.saldoSinal.dataset.sinal;

function definirSinal(sinal) {
  const negativo = sinal === "-";
  campos.saldoSinal.dataset.sinal = sinal;
  campos.saldoSinal.textContent = negativo ? "−" : "+";
  campos.saldoSinal.setAttribute("aria-pressed", String(negativo));
  campos.saldoSinal.setAttribute(
    "aria-label", `Sinal do saldo: ${negativo ? "negativo" : "positivo"}. Clique para alternar.`
  );
}

// `min` em minutos (ou null para deixar o campo vazio).
function definirSaldo(min) {
  definirSinal(min !== null && min < 0 ? "-" : "+");
  campos.saldo.value = min === null ? "" : formatDuracao(min);
}

const lerSaldoTexto = () => sinalSaldo() + campos.saldo.value;

function mostrarErro(msg) {
  $("erro").textContent = msg;
  $("erro").hidden = !msg;
}

function mostrarStatus(msg) {
  $("status").textContent = msg;
}

let calculoAtual = null; // { saldoRestanteMin, estrategia, dias } do último cálculo válido

function limparResultado() {
  calculoAtual = null;
  $("resultado").hidden = true;
}

function lerEntradas() {
  const cargaMin = parseHora(campos.carga.value);
  if (cargaMin === null || cargaMin === 0) return { erro: "Informe a carga horária diária (HH:MM)." };

  const saldoMin = parseSaldo(lerSaldoTexto());
  if (saldoMin === null) return { erro: "Informe o saldo anterior em HH:MM (minutos de 00 a 59) e confira o sinal." };

  const entrada1Min = parseHora(campos.entrada1.value);
  const saida1Min = parseHora(campos.saida1.value);
  const entrada2Min = parseHora(campos.entrada2.value);
  if (entrada1Min === null || saida1Min === null || entrada2Min === null) {
    return { erro: "Preencha Entrada 1, Saída 1 e Entrada 2 (HH:MM)." };
  }

  const estrategia = estrategiaSelecionada();
  const dias = Number(campos.dias.value);
  if (estrategia === "dividir" && (!Number.isInteger(dias) || dias < 2 || dias > 60)) {
    return { erro: "Informe um número de dias inteiro entre 2 e 60." };
  }

  let saidaFixaMin = null;
  if (estrategia === "fixo") {
    saidaFixaMin = parseHora(campos.saidaFixa.value);
    if (saidaFixaMin === null) return { erro: "Informe o horário em que você quer sair (HH:MM)." };
  }

  return { cargaMin, saldoMin, entrada1Min, saida1Min, entrada2Min, estrategia, dias, saidaFixaMin };
}

async function aoCalcular(evento) {
  evento.preventDefault();
  mostrarStatus("");
  limparResultado();

  const entradas = lerEntradas();
  if (entradas.erro) return mostrarErro(entradas.erro);

  const r = calcular(entradas);
  if (!r.ok) return mostrarErro(r.erro);

  mostrarErro("");
  $("saida2").textContent = formatDuracao(r.saida2Min);
  if (entradas.estrategia === "fixo") {
    $("saidaBase").textContent = "Seu saldo absorveu o atraso/extra de hoje.";
    $("saldoAplicado").textContent = `Novo saldo para amanhã: ${formatSaldo(r.saldoRestanteMin)}`;
  } else {
    $("saidaBase").textContent = `Saída normal sem saldo: ${formatDuracao(r.saidaBaseMin)}`;
    $("saldoAplicado").textContent =
      `Saldo aplicado: ${formatSaldo(r.aplicadoMin)} (restam ${formatSaldo(r.saldoRestanteMin)})`;
  }
  $("horasTrabalhadas").textContent = `Horas trabalhadas no dia: ${formatDuracao(r.totalMin)}`;
  $("resultado").hidden = false;
  calculoAtual = { saldoRestanteMin: r.saldoRestanteMin, estrategia: entradas.estrategia, dias: entradas.dias };

  await salvarEstado({
    cargaHoraria: campos.carga.value,
    saldoMin: entradas.saldoMin,
    entrada1: campos.entrada1.value,
    saida1: campos.saida1.value,
    entrada2: campos.entrada2.value,
    estrategia: entradas.estrategia,
    dias: Number.isInteger(entradas.dias) && entradas.dias >= 2 ? entradas.dias : 2,
    saidaFixa: campos.saidaFixa.value || "18:00",
  });
}

async function aoEncerrarDia() {
  if (!calculoAtual) return;

  const proximo = encerrarDia(calculoAtual);
  const ok = confirm(
    `Encerrar o dia? O saldo anterior passa a ser ${formatSaldo(proximo.saldoMin)} e os horários serão limpos.`
  );
  if (!ok) return;

  definirSaldo(proximo.saldoMin);
  campos.entrada1.value = "";
  campos.saida1.value = "";
  campos.entrada2.value = "";
  campos.dias.value = proximo.dias;
  selecionarEstrategia(proximo.estrategia);
  limparResultado();
  mostrarErro("");

  await salvarEstado({
    cargaHoraria: campos.carga.value,
    saldoMin: proximo.saldoMin,
    entrada1: "",
    saida1: "",
    entrada2: "",
    estrategia: proximo.estrategia,
    dias: proximo.dias,
    saidaFixa: campos.saidaFixa.value || "18:00",
  });
  mostrarStatus(`Dia encerrado. Saldo anterior: ${formatSaldo(proximo.saldoMin)}`);
}

async function carregar() {
  const s = await carregarEstado();
  campos.carga.value = s.cargaHoraria;
  definirSaldo(s.saldoMin);
  campos.entrada1.value = s.entrada1;
  campos.saida1.value = s.saida1;
  campos.entrada2.value = s.entrada2;
  campos.dias.value = s.dias;
  campos.saidaFixa.value = s.saidaFixa;
  selecionarEstrategia(s.estrategia);
}

const aoEditar = () => { limparResultado(); mostrarErro(""); mostrarStatus(""); };

$("form").addEventListener("submit", aoCalcular);
$("encerrar").addEventListener("click", aoEncerrarDia);
[campos.carga, campos.saldo, campos.entrada1, campos.saida1, campos.entrada2, campos.dias, campos.saidaFixa].forEach((el) =>
  el.addEventListener("input", aoEditar)
);
campos.estrategias.forEach((el) =>
  el.addEventListener("change", () => { atualizarCamposEstrategia(); aoEditar(); })
);

// Sinal do saldo: botão (clique), tecla + ou - (em qualquer parte do campo ou no botão) e ao colar.
const aoTeclaSinal = (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const sinal = e.key === "+" ? "+" : (e.key === "-" || e.key === "−") ? "-" : null;
  if (!sinal) return;
  e.preventDefault();
  definirSinal(sinal);
  aoEditar();
};
campos.saldo.addEventListener("keydown", aoTeclaSinal);
campos.saldoSinal.addEventListener("keydown", aoTeclaSinal);
campos.saldo.addEventListener("paste", (e) => {
  const sinal = sinalDoTexto(e.clipboardData ? e.clipboardData.getData("text") : "");
  if (sinal) definirSinal(sinal);
});
campos.saldoSinal.addEventListener("click", () => {
  definirSinal(sinalSaldo() === "+" ? "-" : "+");
  aoEditar();
});
// O navegador trata os rádios como uma única parada do Tab (só o marcado recebe foco).
// Aqui o Tab percorre, em ordem, cada opção e o campo que ela exibe; sair pelas pontas segue o padrão.
// A seleção continua por Espaço ou setas.
const paradasEstrategia = () => {
  const [hoje, fixo, dividir] = campos.estrategias;
  return [hoje, fixo, ...(campos.saidaFixa.hidden ? [] : [campos.saidaFixa]), dividir,
    ...(campos.dias.disabled ? [] : [campos.dias])];
};
$("objetivo").addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const paradas = paradasEstrategia();
  const i = paradas.indexOf(e.target);
  const proxima = paradas[i + (e.shiftKey ? -1 : 1)];
  if (i === -1 || !proxima) return;
  e.preventDefault();
  proxima.focus();
});

carregar();


