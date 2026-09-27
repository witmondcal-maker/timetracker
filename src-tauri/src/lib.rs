mod janela;

use janela::{definir_altura, posicionar_no_canto};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![definir_altura])
        .setup(|aplicativo| {
            posicionar_no_canto(aplicativo.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao executar o aplicativo");
}
