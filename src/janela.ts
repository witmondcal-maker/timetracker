// Altura da janela ao abrir ou fechar o histórico.

import { invoke, isTauri } from "@tauri-apps/api/core";

export async function ajustarAltura(historicoAberto: boolean): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke("definir_altura", { historicoAberto });
}
