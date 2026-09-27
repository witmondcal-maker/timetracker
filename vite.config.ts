import { defineConfig } from "vite";
// @ts-expect-error tipo sem o pacote @types/node
import process from "node:process";

const hostExterno = process.env.TAURI_DEV_HOST;

// Servidor fixo na porta 43123, acessível na rede local.
export default defineConfig(() => ({
  clearScreen: false,
  server: {
    host: "0.0.0.0",
    port: 43123,
    strictPort: true,
    hmr: hostExterno
      ? {
          protocol: "ws",
          host: hostExterno,
          port: 43124,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
