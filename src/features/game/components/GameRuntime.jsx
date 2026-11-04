import { useEffect, useState } from "react";
import { loadLegacyScripts } from "../../../shared/lib/legacyScriptLoader.js";

const GAME_SCRIPTS = [
  "legacy/game/game-i18n.js",
  "legacy/game/engine.js",
  "legacy/game/bot.js",
  "legacy/game/board2d.js",
  "legacy/game/app.js",
];

function GameLoadingScreen({ error }) {
  return (
    <main
      role={error ? "alert" : "status"}
      aria-live="polite"
      aria-busy={!error}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0f14",
        color: "#e8eef7",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <strong style={{ color: "#6ee7b7", fontSize: 20 }}>3dXess</strong>
        <p style={{ margin: "12px 0 0", color: "#aab8c8", fontSize: 14 }}>
          {error || "Preparando o tabuleiro…"}
        </p>
        {error ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 18,
              padding: "10px 16px",
              border: 0,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6ee7b7, #38bdf8)",
              color: "#04121a",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Recarregar página
          </button>
        ) : null}
      </div>
    </main>
  );
}

export function GameRuntime({ children }) {
  const [stylesReady, setStylesReady] = useState(false);
  const [error, setError] = useState("");

  // The game markup must not mount before its stylesheet has been applied.
  // Otherwise the full lobby briefly flashes as unstyled HTML.
  useEffect(() => {
    let active = true;

    import("../../../styles/game.css")
      .then(() => {
        if (active) setStylesReady(true);
      })
      .catch((loadError) => {
        console.error("Falha ao carregar estilos do jogo:", loadError);
        if (active) {
          setError(
            loadError.message || "Não foi possível carregar os estilos do jogo.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // The legacy controller queries the DOM by ID, so load it only after React
  // has committed the game markup to the document.
  useEffect(() => {
    if (!stylesReady || error) return undefined;
    let active = true;

    loadLegacyScripts(GAME_SCRIPTS).catch((loadError) => {
      console.error("Falha ao carregar módulos do jogo:", loadError);
      if (active) {
        setError(loadError.message || "Falha ao carregar o jogo.");
      }
    });

    return () => {
      active = false;
    };
  }, [stylesReady, error]);

  if (!stylesReady) return <GameLoadingScreen error={error} />;

  return (
    <>
      {children}
      {error ? <div className="runtime-error" role="alert">{error}</div> : null}
    </>
  );
}
