import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MULTIPLICADOR,
  analisarDuracao,
  calcularMedia,
  calcularRitmo,
  calcularTempoEsperado,
  formatarDuracaoEntrada,
  formatarRelogio,
  formatarRitmo,
  normalizarEntradaDuracao,
  ritmoPassouDaMeta,
  resumirAmostras,
} from "../src/dominio.ts";
import {
  criarCronometro,
  estaRodando,
  lerDecorridoMs,
  pausarCronometro,
  restaurarCronometro,
  retomarCronometro,
} from "../src/cronometro.ts";

test("duração em mm:ss, com minutos acima de 59", () => {
  assert.equal(analisarDuracao("90:30"), 90 * 60 + 30);
  assert.equal(analisarDuracao("5:05"), 305);
  assert.equal(analisarDuracao("00:01"), 1);
  assert.equal(analisarDuracao("0:00"), null);
  assert.equal(analisarDuracao("90:60"), null);
  assert.equal(analisarDuracao("5:5"), null);
  assert.equal(analisarDuracao(""), null);
  assert.equal(analisarDuracao("abc"), null);
});

test("tempo esperado usa o multiplicador 7", () => {
  assert.equal(MULTIPLICADOR, 7);
  assert.equal(calcularTempoEsperado(60), 420);
  assert.equal(formatarRelogio(calcularTempoEsperado(90 * 60 + 30)), "10:33:30");
});

test("ritmo com vírgula e vermelho só depois de 7", () => {
  assert.equal(formatarRitmo(7), "7,0");
  assert.equal(formatarRitmo(7.04), "7,0");
  assert.equal(formatarRitmo(7.05), "7,1");
  assert.equal(ritmoPassouDaMeta(7), false);
  assert.equal(ritmoPassouDaMeta(7.04), false);
  assert.equal(ritmoPassouDaMeta(7.05), true);
  assert.equal(calcularRitmo(420, 60), 7);
});

test("médias só entram com amostras concluídas", () => {
  assert.equal(calcularMedia([]), null);
  const resumo = resumirAmostras([
    { tempoGastoSegundos: 10, esperadoSegundos: 70 },
    { tempoGastoSegundos: 20, esperadoSegundos: 140 },
  ]);
  assert.equal(resumo.quantidade, 2);
  assert.equal(resumo.ahtAtualSegundos, 15);
  assert.equal(resumo.ahtEsperadoSegundos, 105);
});

test("relogio em hh:mm:ss e duração de entrada em mm:ss", () => {
  assert.equal(formatarRelogio(0), "00:00:00");
  assert.equal(formatarRelogio(3661), "01:01:01");
  assert.equal(formatarDuracaoEntrada(90 * 60 + 30), "90:30");
  assert.equal(normalizarEntradaDuracao("ab12x:345"), "12:34");
});

test("pausa e retomada não contam o intervalo parado", () => {
  const criado = criarCronometro(60, 1_000);
  assert.equal(lerDecorridoMs(criado, 2_500), 1_500);
  const pausado = pausarCronometro(criado, 2_500);
  assert.equal(estaRodando(pausado), false);
  assert.equal(lerDecorridoMs(pausado, 99_000), 1_500);
  const retomado = retomarCronometro(pausado, 20_000);
  assert.equal(lerDecorridoMs(retomado, 20_500), 2_000);
});

test("restaurar tarefa rodando ignora o tempo em que ficou fechada", () => {
  const restaurado = restaurarCronometro(60, 5_000, true, 100_000);
  assert.equal(estaRodando(restaurado), true);
  assert.equal(lerDecorridoMs(restaurado, 100_000), 5_000);
  assert.equal(lerDecorridoMs(restaurado, 101_000), 6_000);
  const pausado = restaurarCronometro(60, 5_000, false, 100_000);
  assert.equal(estaRodando(pausado), false);
  assert.equal(lerDecorridoMs(pausado, 200_000), 5_000);
});
