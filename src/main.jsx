import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import App from "./App.jsx";
import { getLocaleI18n } from "./shared/i18n/index.js";
import "./styles/site.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('O elemento raiz "#root" não foi encontrado.');
}

const root = createRoot(rootElement);
const locale = document.documentElement.lang || "pt-BR";
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

getLocaleI18n(locale)
  .then((i18n) => {
    root.render(
      <React.StrictMode>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter basename={basename}>
            <App />
          </BrowserRouter>
        </I18nextProvider>
      </React.StrictMode>,
    );
  })
  .catch((error) => {
    console.error("Falha ao inicializar a internacionalização:", error);
    root.render(
      <main role="alert" style={{ maxWidth: 560, margin: "10vh auto", padding: 24, color: "#e8eef7", fontFamily: "system-ui, sans-serif" }}>
        <h1>Não foi possível iniciar o 3dXess.</h1>
        <p>Recarregue a página. Se o problema continuar, tente novamente mais tarde.</p>
      </main>,
    );
  });
