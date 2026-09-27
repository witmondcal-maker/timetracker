// Cálculos da meta: tempo esperado, ritmo e médias.

export const MULTIPLICADOR = 7;

export type AmostraConcluida = {
  tempoGastoSegundos: number;
  esperadoSegundos: number;
};

export type Resumo = {
  ahtAtualSegundos: number | null;
  ahtEsperadoSegundos: number | null;
  quantidade: number;
};

// Aceita mm:ss. Minutos podem passar de 59. Segundos ficam entre 00 e 59.
export function analisarDuracao(texto: string): number | null {
  const correspondencia = /^(\d+):([0-5]\d)$/.exec(texto.trim());
  if (!correspondencia) {
    return null;
  }
  const minutos = Number(correspondencia[1]);
  const segundos = Number(correspondencia[2]);
  const total = minutos * 60 + segundos;
  if (total <= 0) {
    return null;
  }
  return total;
}

export function normalizarEntradaDuracao(texto: string): string {
  const apenas = texto.replace(/[^\d:]/g, "");
  const [minutos = "", ...resto] = apenas.split(":");
  const minutosLimitados = minutos.slice(0, 4);
  if (resto.length === 0) {
    return minutosLimitados;
  }
  const segundos = resto.join("").slice(0, 2);
  return `${minutosLimitados}:${segundos}`;
}

export function calcularTempoEsperado(duracaoSegundos: number): number {
  return duracaoSegundos * MULTIPLICADOR;
}

export function calcularRitmo(tempoGastoSegundos: number, duracaoSegundos: number): number {
  if (duracaoSegundos <= 0) {
    return 0;
  }
  return tempoGastoSegundos / duracaoSegundos;
}

export function calcularMedia(valores: readonly number[]): number | null {
  if (valores.length === 0) {
    return null;
  }
  const soma = valores.reduce((acumulado, valor) => acumulado + valor, 0);
  return soma / valores.length;
}

export function resumirAmostras(amostras: readonly AmostraConcluida[]): Resumo {
  return {
    ahtAtualSegundos: calcularMedia(amostras.map((amostra) => amostra.tempoGastoSegundos)),
    ahtEsperadoSegundos: calcularMedia(amostras.map((amostra) => amostra.esperadoSegundos)),
    quantidade: amostras.length,
  };
}

// Vermelho quando o ritmo exibido, com uma casa, passa de 7.
export function ritmoPassouDaMeta(ritmo: number): boolean {
  return Math.round(ritmo * 10) > MULTIPLICADOR * 10;
}

export function formatarRelogio(totalSegundos: number): string {
  const segundosInteiros = Math.max(0, Math.floor(totalSegundos));
  const horas = Math.floor(segundosInteiros / 3600);
  const minutos = Math.floor((segundosInteiros % 3600) / 60);
  const segundos = segundosInteiros % 60;
  return [horas, minutos, segundos].map(comDoisDigitos).join(":");
}

export function formatarDuracaoEntrada(totalSegundos: number): string {
  const segundosInteiros = Math.max(0, Math.floor(totalSegundos));
  const minutos = Math.floor(segundosInteiros / 60);
  const segundos = segundosInteiros % 60;
  return `${comDoisDigitos(minutos)}:${comDoisDigitos(segundos)}`;
}

export function formatarMedia(segundos: number | null): string {
  if (segundos === null) {
    return "—";
  }
  return formatarRelogio(Math.round(segundos));
}

export function formatarRitmo(ritmo: number): string {
  const centesimos = Math.round(ritmo * 10);
  const sinal = centesimos < 0 ? "-" : "";
  const absoluto = Math.abs(centesimos);
  const inteiro = Math.floor(absoluto / 10);
  const decimal = absoluto % 10;
  return `${sinal}${inteiro},${decimal}`;
}

export function formatarHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return "—";
  }
  return `${comDoisDigitos(data.getHours())}:${comDoisDigitos(data.getMinutes())}`;
}

export function formatarMomento(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return "—";
  }
  const dia = comDoisDigitos(data.getDate());
  const mes = comDoisDigitos(data.getMonth() + 1);
  return `${dia}/${mes} ${formatarHora(iso)}`;
}

function comDoisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}
