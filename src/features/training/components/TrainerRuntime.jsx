import { useEffect, useState } from "react";
import { loadLegacyScripts } from "../../../shared/lib/legacyScriptLoader.js";

const TRAINER_SCRIPTS = [
  "legacy/game/engine.js",
  "legacy/vendor/three.min.js",
  "legacy/vendor/OrbitControls.js",
  "legacy/game/board3d.js",
  "legacy/training/practice.js",
];

export function TrainerRuntime({ mode = "practice", children }) {
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    document.body.dataset.trainerMode = mode === "daily" ? "daily" : "";

    async function initialize() {
      try {
        await import("../../../styles/game.css");
        await loadLegacyScripts(TRAINER_SCRIPTS);
      } catch (loadError) {
        console.error(loadError);
        if (active) setError(loadError.message || "Falha ao carregar o treinador.");
      }
    }

    initialize();
    return () => {
      active = false;
      delete document.body.dataset.trainerMode;
    };
  }, [mode]);

  return (
    <>
      {children}
      {error ? <p className="runtime-error" role="alert">{error}</p> : null}
    </>
  );
}
