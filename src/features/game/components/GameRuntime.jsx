import { useEffect, useState } from "react";
import { loadLegacyScripts } from "../../../shared/lib/legacyScriptLoader.js";

const GAME_SCRIPTS = [
  "legacy/game/game-i18n.js",
  "legacy/game/engine.js",
  "legacy/game/bot.js",
  "legacy/game/board2d.js",
  "legacy/game/app.js",
];

export function GameRuntime({ children }) {
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await import("../../../styles/game.css");
        await loadLegacyScripts(GAME_SCRIPTS);
      } catch (loadError) {
        console.error(loadError);
        if (active) setError(loadError.message || "Falha ao carregar o jogo.");
      }
    }

    initialize();
    return () => { active = false; };
  }, []);

  return (
    <>
      {children}
      {error ? <div className="runtime-error" role="alert">{error}</div> : null}
    </>
  );
}
