import { useEffect, useState } from "react";
import { loadLegacyScripts } from "../../../shared/lib/legacyScriptLoader.js";

const GAME_SETTINGS_KEY = "xadrez3d.settings.v3";
const ACCOUNT_SESSION_KEY = "3dxess.account.session.v1";

function hasCachedAccountIdentity() {
  try {
    const value = JSON.parse(localStorage.getItem(ACCOUNT_SESSION_KEY) || "null");
    return Boolean(value?.uid && value?.username);
  } catch {
    return false;
  }
}

function clearCachedAccountIdentity() {
  try {
    localStorage.removeItem(ACCOUNT_SESSION_KEY);
  } catch {
    // The game can still run as a guest if storage is unavailable.
  }
}

function cacheAccountIdentity(uid, value) {
  const username = String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 20);
  if (!uid || !username) {
    clearCachedAccountIdentity();
    return;
  }

  try {
    const settings = JSON.parse(localStorage.getItem(GAME_SETTINGS_KEY) || "{}");
    localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify({ ...settings, nickname: username }));
    localStorage.setItem(ACCOUNT_SESSION_KEY, JSON.stringify({ uid, username }));
  } catch {
    // Firestore remains the source of truth if storage is unavailable.
  }
}

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
  // has committed the game markup and the saved Firebase player name is synced.
  useEffect(() => {
    if (!stylesReady || error) return undefined;
    let active = true;
    let started = false;
    let unsubscribe = null;

    const loadGame = () => {
      if (!active || started) return;
      started = true;
      loadLegacyScripts(GAME_SCRIPTS).catch((loadError) => {
        console.error("Falha ao carregar módulos do jogo:", loadError);
        if (active) {
          setError(loadError.message || "Falha ao carregar o jogo.");
        }
      });
    };

    // Firebase is only needed when a player without a cached identity opens the game.
    async function restoreAccountAndLoad() {
      if (hasCachedAccountIdentity()) {
        loadGame();
        return;
      }

      try {
        const client = await import("../../../shared/firebase/client.js");
        if (!active) return;
        if (!client.firebaseConfigReady || !client.auth || !client.db) {
          loadGame();
          return;
        }

        const [{ onAuthStateChanged }, { doc, getDoc }] = await Promise.all([
          import("firebase/auth"),
          import("firebase/firestore"),
        ]);
        if (!active) return;

        unsubscribe = onAuthStateChanged(client.auth, (user) => {
          if (!active || started) return;
          if (unsubscribe) unsubscribe();
          unsubscribe = null;

          const syncAndLoad = async () => {
            if (!user) {
              clearCachedAccountIdentity();
              return;
            }

            try {
              const snapshot = await getDoc(doc(client.db, "users", user.uid));
              if (snapshot.exists()) {
                cacheAccountIdentity(user.uid, snapshot.data().username);
              } else {
                clearCachedAccountIdentity();
              }
            } catch (syncError) {
              console.warn("Não foi possível sincronizar o nome da conta:", syncError);
            }
          };

          syncAndLoad().finally(loadGame);
        }, (authError) => {
          console.warn("Não foi possível restaurar a sessão Firebase:", authError);
          loadGame();
        });
      } catch (bootstrapError) {
        console.warn("Firebase indisponível; o jogo continuará como visitante:", bootstrapError);
        loadGame();
      }
    }

    restoreAccountAndLoad();

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
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
