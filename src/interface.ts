// Tela. Só chama domínio, cronômetro, persistência e a janela.

import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import {
  analisarDuracao,
  calcularRitmo,
  calcularTempoEsperado,
  formatarDuracaoEntrada,
  formatarHora,
  formatarMedia,
  formatarMomento,
  formatarRelogio,
  formatarRitmo,
  normalizarEntradaDuracao,
  ritmoPassouDaMeta,
  resumirAmostras,
} from "./dominio.ts";
import {
  criarCronometro,
  estaRodando,
  lerDecorridoMs,
  lerSegundosDecorridos,
  pausarCronometro,
  restaurarCronometro,
  retomarCronometro,
  type Cronometro,
} from "./cronometro.ts";
import { ajustarAltura } from "./janela.ts";
import {
  apagarHistorico,
  apagarTarefaAberta,
  gravarTarefaEncerrada,
  lerTarefaAberta,
  listarTarefasEncerradas,
  prepararBanco,
  salvarTarefaAberta,
  type TarefaEncerrada,
} from "./persistencia.ts";

type Dialogo = "nenhum" | "encerrar" | "descartar" | "zerar";

type Tela = {
  campoDuracao: HTMLInputElement;
  erroDuracao: HTMLElement;
  tempo: HTMLElement;
  estadoTempo: HTMLElement;
  esperado: HTMLElement;
  ritmo: HTMLElement;
  ahtAtual: HTMLElement;
  ahtEsperado: HTMLElement;
  concluidas: HTMLElement;
  avisoVazio: HTMLElement;
  erroGravacao: HTMLElement;
  botaoIniciar: HTMLButtonElement;
  botaoPausar: HTMLButtonElement;
  botaoEncerrar: HTMLButtonElement;
  botaoDescartar: HTMLButtonElement;
  botaoZerar: HTMLButtonElement;
  botaoHistorico: HTMLButtonElement;
  painelHistorico: HTMLElement;
  corpoHistorico: HTMLTableSectionElement;
  vazioHistorico: HTMLElement;
  dialogo: HTMLDialogElement;
  tituloDialogo: HTMLElement;
  textoDialogo: HTMLElement;
  campoZerar: HTMLInputElement;
  blocoZerar: HTMLElement;
  botaoNegar: HTMLButtonElement;
  botaoConfirmar: HTMLButtonElement;
};

let tela: Tela | null = null;
let cronometro: Cronometro | null = null;
let tarefas: TarefaEncerrada[] = [];
let historicoAberto = false;
let dialogo: Dialogo = "nenhum";
let duracaoInvalida = false;
let intervalo: number | null = null;
let ultimoSalvamento = 0;
let gravando = false;

export async function montarInterface(raiz: HTMLElement): Promise<void> {
  raiz.replaceChildren(paragrafo("abrindo…", "abrindo"));
  try {
    await prepararBanco();
    tarefas = await listarTarefasEncerradas();
    await restaurarTarefaAberta();
  } catch {
    raiz.replaceChildren(paragrafo("não foi possível abrir os dados locais.", "falha"));
    return;
  }

  tela = criarTela();
  raiz.replaceChildren();
  preencherRaiz(raiz, tela);
  ligarEventos(tela);
  await observarFechamento();
  sincronizarPulso();
  atualizarTudo();
}

function paragrafo(texto: string, classe: string): HTMLParagraphElement {
  const elemento = document.createElement("p");
  elemento.className = classe;
  elemento.textContent = texto;
  return elemento;
}

async function restaurarTarefaAberta(): Promise<void> {
  const aberta = await lerTarefaAberta();
  if (!aberta) {
    return;
  }
  cronometro = restaurarCronometro(
    aberta.duracaoSegundos,
    aberta.decorridoMs,
    aberta.rodando,
    Date.now(),
  );
}

function criarTela(): Tela {
  const campoDuracao = document.createElement("input");
  campoDuracao.id = "duracao";
  campoDuracao.placeholder = "mm:ss";
  campoDuracao.autocomplete = "off";
  campoDuracao.spellcheck = false;
  campoDuracao.setAttribute("aria-describedby", "erro-duracao");

  const erroDuracao = document.createElement("small");
  erroDuracao.id = "erro-duracao";
  erroDuracao.className = "erro";

  const tempo = document.createElement("p");
  tempo.className = "tempo";
  tempo.textContent = "00:00:00";

  const estadoTempo = document.createElement("span");
  estadoTempo.className = "estado-tempo";

  const esperado = document.createElement("dd");
  const ritmo = document.createElement("dd");
  ritmo.id = "ritmo";
  const ahtAtual = document.createElement("dd");
  const ahtEsperado = document.createElement("dd");
  const concluidas = document.createElement("dd");

  const avisoVazio = document.createElement("p");
  avisoVazio.className = "vazio";
  avisoVazio.textContent = "nenhuma tarefa";

  const erroGravacao = document.createElement("p");
  erroGravacao.className = "erro-gravacao";
  erroGravacao.hidden = true;

  const botaoIniciar = botao("iniciar", "principal");
  const botaoPausar = botao("pausar");
  const botaoEncerrar = botao("encerrar");
  const botaoDescartar = botao("descartar");
  const botaoZerar = botao("zerar", "largo");
  const botaoHistorico = botao("histórico", "alternar");
  botaoHistorico.setAttribute("aria-expanded", "false");

  const corpoHistorico = document.createElement("tbody");
  const vazioHistorico = document.createElement("p");
  vazioHistorico.className = "vazio";
  vazioHistorico.textContent = "nenhuma tarefa";

  const painelHistorico = document.createElement("div");
  painelHistorico.className = "lista";
  painelHistorico.hidden = true;

  const dialogoElemento = document.createElement("dialog");
  const tituloDialogo = document.createElement("p");
  tituloDialogo.className = "dialogo-titulo";
  const textoDialogo = document.createElement("p");
  textoDialogo.className = "dialogo-texto";
  const campoZerar = document.createElement("input");
  campoZerar.autocomplete = "off";
  campoZerar.spellcheck = false;
  campoZerar.setAttribute("aria-label", "digite ZERAR");
  const blocoZerar = document.createElement("label");
  blocoZerar.className = "campo-zerar";
  blocoZerar.append(campoZerar);
  const botaoNegar = botao("não");
  const botaoConfirmar = botao("sim");
  const acoesDialogo = document.createElement("div");
  acoesDialogo.className = "dialogo-acoes";
  acoesDialogo.append(botaoNegar, botaoConfirmar);
  dialogoElemento.append(tituloDialogo, textoDialogo, blocoZerar, acoesDialogo);

  return {
    campoDuracao,
    erroDuracao,
    tempo,
    estadoTempo,
    esperado,
    ritmo,
    ahtAtual,
    ahtEsperado,
    concluidas,
    avisoVazio,
    erroGravacao,
    botaoIniciar,
    botaoPausar,
    botaoEncerrar,
    botaoDescartar,
    botaoZerar,
    botaoHistorico,
    painelHistorico,
    corpoHistorico,
    vazioHistorico,
    dialogo: dialogoElemento,
    tituloDialogo,
    textoDialogo,
    campoZerar,
    blocoZerar,
    botaoNegar,
    botaoConfirmar,
  };
}

function botao(rotulo: string, classe?: string): HTMLButtonElement {
  const elemento = document.createElement("button");
  elemento.type = "button";
  elemento.textContent = rotulo;
  if (classe) {
    elemento.className = classe;
  }
  return elemento;
}

function preencherRaiz(raiz: HTMLElement, refs: Tela): void {
  const app = document.createElement("div");
  app.className = "app";

  const marca = document.createElement("p");
  marca.className = "marca";
  marca.textContent = "anotação de vídeo";

  const rotuloDuracao = document.createElement("span");
  rotuloDuracao.textContent = "duração do vídeo";
  const campo = document.createElement("label");
  campo.className = "campo";
  campo.append(rotuloDuracao, refs.campoDuracao, refs.erroDuracao);

  const rotuloTempo = document.createElement("div");
  rotuloTempo.className = "rotulo";
  const nomeTempo = document.createElement("span");
  nomeTempo.textContent = "tempo da tarefa";
  rotuloTempo.append(nomeTempo, refs.estadoTempo);
  const blocoTempo = document.createElement("section");
  blocoTempo.className = "cronometro";
  blocoTempo.append(rotuloTempo, refs.tempo);

  const medidas = document.createElement("dl");
  medidas.className = "medidas";
  medidas.append(
    linhaMedida("tempo esperado", refs.esperado),
    linhaMedida("ritmo", refs.ritmo),
    linhaMedida("aht atual", refs.ahtAtual, true),
    linhaMedida("aht esperado", refs.ahtEsperado),
    linhaMedida("tarefas concluídas", refs.concluidas),
  );

  const acoes = document.createElement("div");
  acoes.className = "acoes";
  acoes.append(
    refs.botaoIniciar,
    refs.botaoPausar,
    refs.botaoEncerrar,
    refs.botaoDescartar,
    refs.botaoZerar,
  );

  const tabela = document.createElement("table");
  const cabecalho = document.createElement("thead");
  const linhaCabecalho = document.createElement("tr");
  for (const titulo of ["hora", "duração", "tempo gasto", "esperado", "ritmo"]) {
    const celula = document.createElement("th");
    celula.scope = "col";
    celula.textContent = titulo;
    linhaCabecalho.append(celula);
  }
  cabecalho.append(linhaCabecalho);
  tabela.append(cabecalho, refs.corpoHistorico);
  refs.painelHistorico.append(refs.vazioHistorico, tabela);

  const historico = document.createElement("section");
  historico.className = "historico";
  historico.append(refs.botaoHistorico, refs.painelHistorico);

  app.append(marca, campo, blocoTempo, medidas, refs.avisoVazio, refs.erroGravacao, acoes, historico);
  raiz.append(app, refs.dialogo);
}

function linhaMedida(rotulo: string, valor: HTMLElement, separar = false): HTMLDivElement {
  const linha = document.createElement("div");
  if (separar) {
    linha.className = "separador";
  }
  const termo = document.createElement("dt");
  termo.textContent = rotulo;
  linha.append(termo, valor);
  return linha;
}

function ligarEventos(refs: Tela): void {
  refs.campoDuracao.addEventListener("input", aoDigitarDuracao);
  refs.campoDuracao.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      void aoIniciar();
    }
  });
  refs.botaoIniciar.addEventListener("click", () => void aoIniciar());
  refs.botaoPausar.addEventListener("click", () => void aoPausar());
  refs.botaoEncerrar.addEventListener("click", pedirEncerrar);
  refs.botaoDescartar.addEventListener("click", pedirDescartar);
  refs.botaoZerar.addEventListener("click", pedirZerar);
  refs.botaoHistorico.addEventListener("click", () => void alternarHistorico());
  refs.botaoNegar.addEventListener("click", fecharDialogo);
  refs.botaoConfirmar.addEventListener("click", () => void confirmarDialogo());
  refs.campoZerar.addEventListener("input", aoDigitarZerar);
  refs.campoZerar.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      void confirmarDialogo();
    }
  });
  refs.dialogo.addEventListener("cancel", (evento) => {
    evento.preventDefault();
    fecharDialogo();
  });
}

async function observarFechamento(): Promise<void> {
  if (!isTauri()) {
    return;
  }
  const janela = getCurrentWindow();
  await janela.onCloseRequested(async (evento) => {
    evento.preventDefault();
    try {
      await persistirAberta();
    } finally {
      await janela.destroy();
    }
  });
}

function aoDigitarDuracao(): void {
  const refs = exigirTela();
  const normalizado = normalizarEntradaDuracao(refs.campoDuracao.value);
  if (normalizado !== refs.campoDuracao.value) {
    refs.campoDuracao.value = normalizado;
  }
  duracaoInvalida = textoDuracaoInvalido(refs.campoDuracao.value, false);
  atualizarDuracao();
  atualizarEsperadoERitmo();
}

function aoDigitarZerar(): void {
  atualizarDialogo();
}

async function aoIniciar(): Promise<void> {
  const refs = exigirTela();
  if (dialogo !== "nenhum" || gravando) {
    return;
  }
  if (cronometro) {
    if (!estaRodando(cronometro)) {
      cronometro = retomarCronometro(cronometro, Date.now());
      await persistirAberta();
      sincronizarPulso();
      atualizarTudo();
    }
    return;
  }
  const duracao = analisarDuracao(refs.campoDuracao.value);
  if (duracao === null) {
    duracaoInvalida = true;
    atualizarDuracao();
    return;
  }
  duracaoInvalida = false;
  refs.campoDuracao.value = formatarDuracaoEntrada(duracao);
  cronometro = criarCronometro(duracao, Date.now());
  limparErroGravacao();
  await persistirAberta();
  sincronizarPulso();
  atualizarTudo();
}

async function aoPausar(): Promise<void> {
  if (!cronometro || !estaRodando(cronometro) || dialogo !== "nenhum") {
    return;
  }
  cronometro = pausarCronometro(cronometro, Date.now());
  await persistirAberta();
  sincronizarPulso();
  atualizarTudo();
}

function pedirEncerrar(): void {
  if (!cronometro) {
    return;
  }
  abrirDialogo("encerrar");
}

function pedirDescartar(): void {
  if (!cronometro) {
    return;
  }
  abrirDialogo("descartar");
}

function pedirZerar(): void {
  abrirDialogo("zerar");
}

function abrirDialogo(proximo: Dialogo): void {
  const refs = exigirTela();
  dialogo = proximo;
  refs.campoZerar.value = "";
  atualizarDialogo();
  if (proximo === "zerar") {
    refs.campoZerar.focus();
    return;
  }
  refs.botaoNegar.focus();
}

function fecharDialogo(): void {
  dialogo = "nenhum";
  atualizarDialogo();
}

async function confirmarDialogo(): Promise<void> {
  if (dialogo === "encerrar") {
    await confirmarEncerrar();
    return;
  }
  if (dialogo === "descartar") {
    await confirmarDescartar();
    return;
  }
  if (dialogo === "zerar") {
    await confirmarZerar();
  }
}

async function confirmarEncerrar(): Promise<void> {
  if (!cronometro || gravando) {
    return;
  }
  const agora = Date.now();
  const segundos = lerSegundosDecorridos(cronometro, agora);
  gravando = true;
  atualizarAcoes();
  try {
    await gravarTarefaEncerrada({
      duracaoSegundos: cronometro.duracaoSegundos,
      tempoGastoSegundos: segundos,
      esperadoSegundos: calcularTempoEsperado(cronometro.duracaoSegundos),
      ritmo: calcularRitmo(segundos, cronometro.duracaoSegundos),
      encerradaEm: new Date(agora).toISOString(),
    });
    await apagarTarefaAberta();
    tarefas = await listarTarefasEncerradas();
  } catch {
    gravando = false;
    mostrarErroGravacao();
    return;
  }
  gravando = false;
  cronometro = null;
  duracaoInvalida = false;
  dialogo = "nenhum";
  const refs = exigirTela();
  refs.campoDuracao.value = "";
  limparErroGravacao();
  sincronizarPulso();
  atualizarTudo();
}

async function confirmarDescartar(): Promise<void> {
  if (!cronometro || gravando) {
    return;
  }
  gravando = true;
  try {
    await apagarTarefaAberta();
  } catch {
    gravando = false;
    mostrarErroGravacao();
    return;
  }
  gravando = false;
  cronometro = null;
  duracaoInvalida = false;
  dialogo = "nenhum";
  const refs = exigirTela();
  refs.campoDuracao.value = "";
  limparErroGravacao();
  sincronizarPulso();
  atualizarTudo();
}

async function confirmarZerar(): Promise<void> {
  const refs = exigirTela();
  if (refs.campoZerar.value.trim() !== "ZERAR" || gravando) {
    return;
  }
  gravando = true;
  atualizarDialogo();
  try {
    await apagarHistorico();
  } catch {
    gravando = false;
    mostrarErroGravacao();
    atualizarDialogo();
    return;
  }
  gravando = false;
  cronometro = null;
  tarefas = [];
  duracaoInvalida = false;
  dialogo = "nenhum";
  refs.campoDuracao.value = "";
  refs.campoZerar.value = "";
  limparErroGravacao();
  sincronizarPulso();
  atualizarTudo();
}

async function alternarHistorico(): Promise<void> {
  historicoAberto = !historicoAberto;
  atualizarHistorico();
  try {
    await ajustarAltura(historicoAberto);
  } catch {
    // A lista continua na janela mesmo se o tamanho não mudar.
  }
}

async function persistirAberta(): Promise<void> {
  if (!cronometro) {
    return;
  }
  const agora = Date.now();
  ultimoSalvamento = agora;
  await salvarTarefaAberta({
    duracaoSegundos: cronometro.duracaoSegundos,
    decorridoMs: Math.max(0, lerDecorridoMs(cronometro, agora)),
    rodando: estaRodando(cronometro),
  });
}

function sincronizarPulso(): void {
  const rodando = cronometro !== null && estaRodando(cronometro);
  if (rodando && intervalo === null) {
    intervalo = window.setInterval(pulso, 200);
    return;
  }
  if (!rodando && intervalo !== null) {
    window.clearInterval(intervalo);
    intervalo = null;
  }
}

function pulso(): void {
  atualizarCronometroNaTela();
  if (!cronometro || !estaRodando(cronometro)) {
    return;
  }
  const agora = Date.now();
  if (agora - ultimoSalvamento < 1000) {
    return;
  }
  void persistirAberta();
}

function atualizarTudo(): void {
  atualizarDuracao();
  atualizarCronometroNaTela();
  atualizarResumo();
  atualizarAcoes();
  atualizarHistorico();
  atualizarDialogo();
}

function atualizarDuracao(): void {
  const refs = exigirTela();
  const bloqueado = cronometro !== null;
  refs.campoDuracao.disabled = bloqueado;
  if (bloqueado && cronometro) {
    refs.campoDuracao.value = formatarDuracaoEntrada(cronometro.duracaoSegundos);
  }
  refs.campoDuracao.classList.toggle("invalido", duracaoInvalida);
  refs.campoDuracao.setAttribute("aria-invalid", duracaoInvalida ? "true" : "false");
  refs.erroDuracao.textContent = duracaoInvalida ? "duração inválida" : "";
}

function atualizarCronometroNaTela(): void {
  const refs = exigirTela();
  if (!cronometro) {
    refs.tempo.textContent = "00:00:00";
    refs.tempo.className = "tempo";
    refs.estadoTempo.textContent = "";
    refs.estadoTempo.className = "estado-tempo";
  } else if (estaRodando(cronometro)) {
    refs.tempo.textContent = formatarRelogio(lerSegundosDecorridos(cronometro, Date.now()));
    refs.tempo.className = "tempo rodando";
    refs.estadoTempo.textContent = "rodando";
    refs.estadoTempo.className = "estado-tempo rodando";
  } else {
    refs.tempo.textContent = formatarRelogio(lerSegundosDecorridos(cronometro, Date.now()));
    refs.tempo.className = "tempo pausado";
    refs.estadoTempo.textContent = "pausado";
    refs.estadoTempo.className = "estado-tempo";
  }
  atualizarEsperadoERitmo();
}

function atualizarEsperadoERitmo(): void {
  const refs = exigirTela();
  const duracao = duracaoEmFoco();
  refs.esperado.textContent = duracao === null ? "—" : formatarRelogio(calcularTempoEsperado(duracao));
  if (!cronometro) {
    refs.ritmo.textContent = "—";
    refs.ritmo.className = "";
    return;
  }
  const ritmo = calcularRitmo(
    lerSegundosDecorridos(cronometro, Date.now()),
    cronometro.duracaoSegundos,
  );
  refs.ritmo.textContent = formatarRitmo(ritmo);
  refs.ritmo.className = ritmoPassouDaMeta(ritmo) ? "ritmo acima" : "ritmo";
}

function atualizarResumo(): void {
  const refs = exigirTela();
  const resumo = resumirAmostras(tarefas);
  refs.ahtAtual.textContent = formatarMedia(resumo.ahtAtualSegundos);
  refs.ahtEsperado.textContent = formatarMedia(resumo.ahtEsperadoSegundos);
  refs.concluidas.textContent = String(resumo.quantidade);
  refs.avisoVazio.hidden = resumo.quantidade > 0 || historicoAberto;
}

function atualizarAcoes(): void {
  const refs = exigirTela();
  const aberta = cronometro !== null;
  const rodando = cronometro !== null && estaRodando(cronometro);
  const bloqueado = dialogo !== "nenhum" || gravando;
  refs.botaoIniciar.disabled = bloqueado || rodando;
  refs.botaoPausar.disabled = bloqueado || !rodando;
  refs.botaoEncerrar.disabled = bloqueado || !aberta;
  refs.botaoDescartar.disabled = bloqueado || !aberta;
  refs.botaoZerar.disabled = bloqueado;
  refs.botaoHistorico.disabled = gravando && dialogo !== "nenhum";
}

function atualizarHistorico(): void {
  const refs = exigirTela();
  refs.painelHistorico.hidden = !historicoAberto;
  refs.botaoHistorico.setAttribute("aria-expanded", historicoAberto ? "true" : "false");
  refs.botaoHistorico.replaceChildren();
  const nome = document.createElement("span");
  nome.textContent = "histórico";
  const seta = document.createElement("span");
  seta.textContent = historicoAberto ? "▴" : "▾";
  refs.botaoHistorico.append(nome, seta);

  const semTarefas = tarefas.length === 0;
  refs.vazioHistorico.hidden = !historicoAberto || !semTarefas;
  refs.corpoHistorico.replaceChildren();
  const tabela = refs.corpoHistorico.parentElement;
  if (tabela) {
    tabela.hidden = !historicoAberto || semTarefas;
  }
  if (!historicoAberto || semTarefas) {
    refs.avisoVazio.hidden = semTarefas ? historicoAberto : true;
    return;
  }
  refs.avisoVazio.hidden = true;
  for (const tarefa of tarefas) {
    refs.corpoHistorico.append(linhaHistorico(tarefa));
  }
}

function linhaHistorico(tarefa: TarefaEncerrada): HTMLTableRowElement {
  const linha = document.createElement("tr");
  const hora = document.createElement("td");
  hora.textContent = formatarHora(tarefa.encerradaEm);
  hora.title = formatarMomento(tarefa.encerradaEm);
  const duracao = document.createElement("td");
  duracao.textContent = formatarDuracaoEntrada(tarefa.duracaoSegundos);
  const gasto = document.createElement("td");
  gasto.textContent = formatarRelogio(tarefa.tempoGastoSegundos);
  const esperado = document.createElement("td");
  esperado.textContent = formatarRelogio(tarefa.esperadoSegundos);
  const ritmo = document.createElement("td");
  ritmo.textContent = formatarRitmo(tarefa.ritmo);
  if (ritmoPassouDaMeta(tarefa.ritmo)) {
    ritmo.className = "acima";
  }
  linha.append(hora, duracao, gasto, esperado, ritmo);
  return linha;
}

function atualizarDialogo(): void {
  const refs = exigirTela();
  if (dialogo === "nenhum") {
    if (refs.dialogo.open) {
      refs.dialogo.close();
    }
    return;
  }
  refs.blocoZerar.hidden = dialogo !== "zerar";
  if (dialogo === "encerrar") {
    refs.tituloDialogo.textContent = "encerrar a tarefa?";
    refs.textoDialogo.textContent = "o tempo medido será gravado.";
    refs.botaoConfirmar.textContent = "sim";
    refs.botaoConfirmar.className = "principal";
    refs.botaoConfirmar.disabled = gravando;
  } else if (dialogo === "descartar") {
    refs.tituloDialogo.textContent = "descartar a tarefa aberta?";
    refs.textoDialogo.textContent = "";
    refs.botaoConfirmar.textContent = "sim";
    refs.botaoConfirmar.className = "perigo";
    refs.botaoConfirmar.disabled = gravando;
  } else {
    refs.tituloDialogo.textContent = "apagar tudo";
    refs.textoDialogo.textContent = "digite ZERAR para apagar o histórico, as médias e a tarefa aberta.";
    refs.botaoConfirmar.textContent = "apagar";
    refs.botaoConfirmar.className = "perigo";
    refs.botaoConfirmar.disabled = gravando || refs.campoZerar.value.trim() !== "ZERAR";
  }
  refs.botaoNegar.disabled = gravando;
  if (!refs.dialogo.open) {
    refs.dialogo.showModal();
  }
}

function duracaoEmFoco(): number | null {
  if (cronometro) {
    return cronometro.duracaoSegundos;
  }
  const refs = exigirTela();
  return analisarDuracao(refs.campoDuracao.value);
}

function textoDuracaoInvalido(texto: string, forcar: boolean): boolean {
  const limpo = texto.trim();
  if (limpo.length === 0 || analisarDuracao(limpo) !== null) {
    return false;
  }
  return forcar || limpo.includes(":");
}

function mostrarErroGravacao(): void {
  const refs = exigirTela();
  refs.erroGravacao.hidden = false;
  refs.erroGravacao.textContent = "não foi possível gravar a tarefa.";
}

function limparErroGravacao(): void {
  const refs = exigirTela();
  refs.erroGravacao.hidden = true;
  refs.erroGravacao.textContent = "";
}

function exigirTela(): Tela {
  if (!tela) {
    throw new Error("tela não montada");
  }
  return tela;
}
