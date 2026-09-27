// Evita o console extra no Windows na versão de release. Não remover.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    rastreador_lib::run()
}
