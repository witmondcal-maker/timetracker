// Cronômetro puro. O intervalo em que o aplicativo ficou fechado não entra na conta.

export type Cronometro = {
  duracaoSegundos: number;
  acumuladoMs: number;
  inicioMs: number | null;
};

export function criarCronometro(duracaoSegundos: number, agoraMs: number): Cronometro {
  return {
    duracaoSegundos,
    acumuladoMs: 0,
    inicioMs: agoraMs,
  };
}

export function pausarCronometro(cronometro: Cronometro, agoraMs: number): Cronometro {
  return {
    duracaoSegundos: cronometro.duracaoSegundos,
    acumuladoMs: lerDecorridoMs(cronometro, agoraMs),
    inicioMs: null,
  };
}

export function retomarCronometro(cronometro: Cronometro, agoraMs: number): Cronometro {
  return {
    duracaoSegundos: cronometro.duracaoSegundos,
    acumuladoMs: cronometro.acumuladoMs,
    inicioMs: agoraMs,
  };
}

export function restaurarCronometro(
  duracaoSegundos: number,
  decorridoMs: number,
  rodando: boolean,
  agoraMs: number,
): Cronometro {
  return {
    duracaoSegundos,
    acumuladoMs: decorridoMs,
    inicioMs: rodando ? agoraMs : null,
  };
}

export function lerDecorridoMs(cronometro: Cronometro, agoraMs: number): number {
  if (cronometro.inicioMs === null) {
    return cronometro.acumuladoMs;
  }
  return cronometro.acumuladoMs + (agoraMs - cronometro.inicioMs);
}

export function lerSegundosDecorridos(cronometro: Cronometro, agoraMs: number): number {
  return Math.floor(lerDecorridoMs(cronometro, agoraMs) / 1000);
}

export function estaRodando(cronometro: Cronometro): boolean {
  return cronometro.inicioMs !== null;
}
