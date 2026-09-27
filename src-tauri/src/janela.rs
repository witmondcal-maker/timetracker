// Janela estreita, no canto superior direito, sempre visível por cima das outras.

use tauri::{AppHandle, LogicalSize, Manager, PhysicalPosition, WebviewWindow};

const LARGURA: f64 = 360.0;
const ALTURA_BASE: f64 = 560.0;
const ALTURA_COM_HISTORICO: f64 = 840.0;

pub(crate) fn posicionar_no_canto(app: &AppHandle) {
    let Some(janela) = app.get_webview_window("main") else {
        eprintln!("janela principal ausente");
        return;
    };

    match canto_superior_direito(&janela) {
        Ok(posicao) => {
            if let Err(erro) = janela.set_position(posicao) {
                eprintln!("não foi possível encostar a janela no canto: {erro}");
            }
        }
        Err(erro) => eprintln!("canto indisponível: {erro}"),
    }

    if let Err(erro) = janela.show() {
        eprintln!("não foi possível mostrar a janela: {erro}");
    }
}

#[tauri::command]
pub(crate) fn definir_altura(janela: WebviewWindow, historico_aberto: bool) -> Result<(), String> {
    let altura = escolher_altura(historico_aberto, altura_maxima(&janela));
    janela
        .set_size(LogicalSize::new(LARGURA, altura))
        .map_err(|erro| erro.to_string())
}

fn escolher_altura(historico_aberto: bool, altura_maxima: f64) -> f64 {
    let desejada = if historico_aberto {
        ALTURA_COM_HISTORICO
    } else {
        ALTURA_BASE
    };
    desejada.min(altura_maxima)
}

fn altura_maxima(janela: &WebviewWindow) -> f64 {
    let Ok(Some(monitor)) = janela.current_monitor() else {
        return ALTURA_COM_HISTORICO;
    };
    let altura_logica = monitor.work_area().size.height as f64 / monitor.scale_factor();
    (altura_logica - 24.0).max(ALTURA_BASE)
}

fn canto_superior_direito(janela: &WebviewWindow) -> Result<PhysicalPosition<i32>, String> {
    let monitor = janela
        .primary_monitor()
        .map_err(|erro| erro.to_string())?
        .ok_or("monitor ausente")?;
    let area = monitor.work_area();
    let margem = (12.0 * monitor.scale_factor()).round() as i32;
    let tamanho = janela.outer_size().map_err(|erro| erro.to_string())?;
    let x = area.position.x + area.size.width as i32 - tamanho.width as i32 - margem;
    let y = area.position.y + margem;
    Ok(PhysicalPosition::new(x.max(area.position.x), y))
}

#[cfg(test)]
mod testes {
    use super::escolher_altura;

    #[test]
    fn historico_aumenta_a_janela() {
        let base = escolher_altura(false, 2000.0);
        let aberta = escolher_altura(true, 2000.0);
        assert!(aberta > base);
    }

    #[test]
    fn altura_respeita_o_monitor() {
        let altura = escolher_altura(true, 600.0);
        assert!(altura <= 600.0);
        assert!(altura > escolher_altura(false, 600.0));
    }
}
