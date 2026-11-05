import { PassThrough } from "node:stream";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import React from "react";
import { renderToPipeableStream } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const root = process.cwd();
const dist = resolve(root, "dist");
const routes = JSON.parse(await (await import("node:fs/promises")).readFile(join(root, "site-routes.json"), "utf8"));
const localeDirectories = { "pt-BR": "ptBR", en: "en", es: "es", "zh-CN": "zhCN" };

function renderToHtml(element, label) {
  return new Promise((resolveHtml, rejectHtml) => {
    const output = new PassThrough();
    const chunks = [];
    const renderErrors = [];
    let renderer;
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectHtml(error);
    };

    const timeout = setTimeout(() => {
      renderer?.abort();
      fail(new Error("Tempo excedido ao pré-renderizar " + label));
    }, 30000);

    output.on("data", (chunk) => chunks.push(chunk));
    output.on("error", fail);
    output.on("end", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (renderErrors.length) {
        rejectHtml(new AggregateError(renderErrors, "Falha ao pré-renderizar " + label));
        return;
      }
      resolveHtml(Buffer.concat(chunks).toString("utf8"));
    });

    try {
      renderer = renderToPipeableStream(element, {
        onAllReady() {
          renderer.pipe(output);
        },
        onShellError: fail,
        onError(error) {
          renderErrors.push(error);
        },
      });
    } catch (error) {
      fail(error);
    }
  });
}

const vite = await createServer({
  root,
  configFile: resolve(root, "vite.config.mjs"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const [{ default: App }, { getLocaleI18n }] = await Promise.all([
    vite.ssrLoadModule("/src/App.jsx"),
    vite.ssrLoadModule("/src/shared/i18n/index.js"),
  ]);

  let renderedRoutes = 0;
  for (const [locale, pages] of Object.entries(routes)) {
    const i18n = await getLocaleI18n(locale);
    for (const [page, route] of Object.entries(pages)) {
      const pathname = route ? "/" + route : "/";
      const element = React.createElement(
        React.StrictMode,
        null,
        React.createElement(
          I18nextProvider,
          { i18n },
          React.createElement(
            MemoryRouter,
            { initialEntries: [pathname] },
            React.createElement(App),
          ),
        ),
      );
      const html = await renderToHtml(element, locale + "/" + page);
      if (!html.includes("<main")) {
        throw new Error("A rota " + locale + "/" + page + " não produziu conteúdo principal.");
      }
      const destination = join(dist, ".prerender", locale, page + ".html");
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, html, "utf8");
      renderedRoutes += 1;
    }
  }

  const ptBR = await getLocaleI18n("pt-BR");
  const notFoundElement = React.createElement(
    React.StrictMode,
    null,
    React.createElement(
      I18nextProvider,
      { i18n: ptBR },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/__404__/"] },
        React.createElement(App),
      ),
    ),
  );
  const notFoundHtml = await renderToHtml(notFoundElement, "404");
  const notFoundPath = join(dist, ".prerender", "404.html");
  await mkdir(dirname(notFoundPath), { recursive: true });
  await writeFile(notFoundPath, notFoundHtml, "utf8");

  console.log("HTML pré-renderizado para " + renderedRoutes + " rotas localizadas e página 404.");
} finally {
  await vite.close();
}
