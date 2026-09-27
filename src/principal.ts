import { montarInterface } from "./interface.ts";

const raiz = document.querySelector("#app");
if (raiz instanceof HTMLElement) {
  void montarInterface(raiz);
}
