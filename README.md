# Rastreador

Rastreador local de tempo para anotação de vídeo. Cada vídeo é uma tarefa. A meta é 7× a duração do vídeo. A janela fica no canto do monitor, sempre no topo.

O histórico fica no arquivo `rastreador.db`, no diretório de dados do aplicativo. Nada é enviado para fora da máquina. No Windows, esse diretório é `%APPDATA%\com.rastreador.app`.

## Como rodar no Windows

É preciso ter Node.js, Rust 1.90 ou mais novo e o WebView2 (já presente no Windows 10 e 11 atualizados).

Na pasta do projeto:

```
npm install
npm run tauri dev
```

Para gerar o executável:

```
npm run tauri build
```
