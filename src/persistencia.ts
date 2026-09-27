// SQLite no diretório de dados do aplicativo. Fora do Tauri, usa memória só para a página de desenvolvimento.

import { isTauri } from "@tauri-apps/api/core";

export type TarefaAberta = {
  duracaoSegundos: number;
  decorridoMs: number;
  rodando: boolean;
};

export type TarefaEncerrada = {
  id: number;
  duracaoSegundos: number;
  tempoGastoSegundos: number;
  esperadoSegundos: number;
  ritmo: number;
  encerradaEm: string;
};

export type NovaTarefaEncerrada = Omit<TarefaEncerrada, "id">;

type Banco = {
  salvarAberta: (tarefa: TarefaAberta) => Promise<void>;
  lerAberta: () => Promise<TarefaAberta | null>;
  apagarAberta: () => Promise<void>;
  gravarEncerrada: (tarefa: NovaTarefaEncerrada) => Promise<void>;
  listar: () => Promise<TarefaEncerrada[]>;
  apagarTudo: () => Promise<void>;
};

type LinhaAberta = {
  duracao_segundos: number;
  decorrido_ms: number;
  rodando: number;
};

type LinhaEncerrada = {
  id: number;
  duracao_segundos: number;
  tempo_gasto_segundos: number;
  esperado_segundos: number;
  ritmo: number;
  encerrada_em: string;
};

const SQL_TAREFAS = `
  CREATE TABLE IF NOT EXISTS tarefas_encerradas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    duracao_segundos INTEGER NOT NULL,
    tempo_gasto_segundos INTEGER NOT NULL,
    esperado_segundos INTEGER NOT NULL,
    ritmo REAL NOT NULL,
    encerrada_em TEXT NOT NULL
  )
`;

const SQL_ABERTA = `
  CREATE TABLE IF NOT EXISTS tarefa_aberta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    duracao_segundos INTEGER NOT NULL,
    decorrido_ms INTEGER NOT NULL,
    rodando INTEGER NOT NULL
  )
`;

let banco: Banco | null = null;

export async function prepararBanco(): Promise<void> {
  banco = isTauri() ? await abrirSqlite() : criarBancoMemoria();
}

export async function salvarTarefaAberta(tarefa: TarefaAberta): Promise<void> {
  await exigirBanco().salvarAberta(tarefa);
}

export async function lerTarefaAberta(): Promise<TarefaAberta | null> {
  return exigirBanco().lerAberta();
}

export async function apagarTarefaAberta(): Promise<void> {
  await exigirBanco().apagarAberta();
}

export async function gravarTarefaEncerrada(tarefa: NovaTarefaEncerrada): Promise<void> {
  await exigirBanco().gravarEncerrada(tarefa);
}

export async function listarTarefasEncerradas(): Promise<TarefaEncerrada[]> {
  return exigirBanco().listar();
}

export async function apagarHistorico(): Promise<void> {
  await exigirBanco().apagarTudo();
}

function exigirBanco(): Banco {
  if (!banco) {
    throw new Error("banco não preparado");
  }
  return banco;
}

async function abrirSqlite(): Promise<Banco> {
  const { default: Database } = await import("@tauri-apps/plugin-sql");
  const db = await Database.load("sqlite:rastreador.db");
  await db.execute(SQL_TAREFAS);
  await db.execute(SQL_ABERTA);

  return {
    async salvarAberta(tarefa) {
      await db.execute(
        `INSERT INTO tarefa_aberta (id, duracao_segundos, decorrido_ms, rodando)
         VALUES (1, $1, $2, $3)
         ON CONFLICT(id) DO UPDATE SET
           duracao_segundos = excluded.duracao_segundos,
           decorrido_ms = excluded.decorrido_ms,
           rodando = excluded.rodando`,
        [tarefa.duracaoSegundos, tarefa.decorridoMs, tarefa.rodando ? 1 : 0],
      );
    },
    async lerAberta() {
      const linhas = await db.select<LinhaAberta[]>(
        "SELECT duracao_segundos, decorrido_ms, rodando FROM tarefa_aberta WHERE id = 1",
      );
      const linha = linhas[0];
      if (!linha) {
        return null;
      }
      return {
        duracaoSegundos: linha.duracao_segundos,
        decorridoMs: linha.decorrido_ms,
        rodando: linha.rodando === 1,
      };
    },
    async apagarAberta() {
      await db.execute("DELETE FROM tarefa_aberta WHERE id = 1");
    },
    async gravarEncerrada(tarefa) {
      await db.execute(
        `INSERT INTO tarefas_encerradas
           (duracao_segundos, tempo_gasto_segundos, esperado_segundos, ritmo, encerrada_em)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tarefa.duracaoSegundos,
          tarefa.tempoGastoSegundos,
          tarefa.esperadoSegundos,
          tarefa.ritmo,
          tarefa.encerradaEm,
        ],
      );
    },
    async listar() {
      const linhas = await db.select<LinhaEncerrada[]>(
        `SELECT id, duracao_segundos, tempo_gasto_segundos, esperado_segundos, ritmo, encerrada_em
         FROM tarefas_encerradas
         ORDER BY id DESC`,
      );
      return linhas.map(converterEncerrada);
    },
    async apagarTudo() {
      await db.execute("DELETE FROM tarefas_encerradas");
      await db.execute("DELETE FROM tarefa_aberta");
    },
  };
}

function criarBancoMemoria(): Banco {
  let aberta: TarefaAberta | null = null;
  let encerradas: TarefaEncerrada[] = [];
  let proximoId = 1;

  return {
    async salvarAberta(tarefa) {
      aberta = { ...tarefa };
    },
    async lerAberta() {
      return aberta ? { ...aberta } : null;
    },
    async apagarAberta() {
      aberta = null;
    },
    async gravarEncerrada(tarefa) {
      encerradas = [{ id: proximoId, ...tarefa }, ...encerradas];
      proximoId += 1;
    },
    async listar() {
      return encerradas.map((tarefa) => ({ ...tarefa }));
    },
    async apagarTudo() {
      aberta = null;
      encerradas = [];
    },
  };
}

function converterEncerrada(linha: LinhaEncerrada): TarefaEncerrada {
  return {
    id: linha.id,
    duracaoSegundos: linha.duracao_segundos,
    tempoGastoSegundos: linha.tempo_gasto_segundos,
    esperadoSegundos: linha.esperado_segundos,
    ritmo: linha.ritmo,
    encerradaEm: linha.encerrada_em,
  };
}
