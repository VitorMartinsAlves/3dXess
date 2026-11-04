const loadedScripts = new Map();

function getScriptUrl(source) {
  return new URL(source, document.baseURI).href;
}

export function loadLegacyScript(source) {
  const url = getScriptUrl(source);
  if (loadedScripts.has(url)) return loadedScripts.get(url);

  const existing = document.querySelector(`script[data-legacy-src="${source}"]`);
  if (existing?.dataset.loaded === "true") {
    const resolved = Promise.resolve(existing);
    loadedScripts.set(url, resolved);
    return resolved;
  }

  const script = existing ?? document.createElement("script");
  script.dataset.legacySrc = source;
  script.async = false;

  const promise = new Promise((resolve, reject) => {
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve(script);
    }, { once: true });
    script.addEventListener("error", () => {
      loadedScripts.delete(url);
      script.remove();
      reject(new Error(`Não foi possível carregar o módulo legado: ${source}`));
    }, { once: true });
  });

  loadedScripts.set(url, promise);
  if (!existing) {
    script.src = url;
    document.body.appendChild(script);
  }
  return promise;
}

export async function loadLegacyScripts(sources) {
  for (const source of sources) {
    await loadLegacyScript(source);
  }
}
