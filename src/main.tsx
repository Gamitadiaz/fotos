import "@fontsource-variable/archivo/wdth.css";
import "./estilos.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import { App } from "./App";

// Instala el "service worker": la pieza que guarda la app para usarla sin internet.
registerSW({ immediate: true });

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
