(() => {
  "use strict";
  const C = window.Chess;
  const B = window.Board3D;
  const $ = id => document.getElementById(id);
  const lang = document.documentElement.lang || "pt-BR";
  const t = {
    "pt-BR": {
      choose: "Escolha um cenário para começar.", ready: "Sua vez. Encontre o lance que cumpre o objetivo.",
      success: "Correto. Objetivo alcançado.", wrong: "Esse lance é legal, mas não resolve o exercício. Tente novamente.",
      hint: "Dica: ", reset: "Posição reiniciada.", noEngine: "Não foi possível carregar o tabuleiro 3D.",
      solved: "resolvidos", attempts: "tentativas", move: "Jogue uma peça no tabuleiro.",
      goals: { mate: "Encontre o xeque-mate em um lance.", queen: "Capture a dama preta em um lance.", castle: "Faça o roque para colocar o rei em segurança.", promote: "Promova o peão a uma peça." },
      successGoal: { mate: "Xeque-mate! Você encontrou a finalização.", queen: "Dama capturada. Boa leitura tática.", castle: "Roque realizado. Rei protegido.", promote: "Promoção realizada. O peão chegou à última fileira." },
      daily: "Desafio diário", dailyDone: "Desafio concluído hoje.", date: "Desafio de "
    },
    en: {
      choose: "Choose a scenario to begin.", ready: "Your turn. Find the move that completes the objective.",
      success: "Correct. Objective completed.", wrong: "That move is legal, but it does not solve this exercise. Try again.",
      hint: "Hint: ", reset: "Position reset.", noEngine: "The 3D board could not be loaded.",
      solved: "solved", attempts: "attempts", move: "Move a piece on the board.",
      goals: { mate: "Find checkmate in one move.", queen: "Capture the black queen in one move.", castle: "Castle to bring your king to safety.", promote: "Promote the pawn to another piece." },
      successGoal: { mate: "Checkmate! You found the finish.", queen: "Queen captured. Good tactical vision.", castle: "Castling complete. Your king is safer.", promote: "Promotion complete. The pawn reached the last rank." },
      daily: "Daily challenge", dailyDone: "Daily challenge completed.", date: "Challenge for "
    },
    es: {
      choose: "Elige un escenario para comenzar.", ready: "Tu turno. Encuentra la jugada que cumple el objetivo.",
      success: "Correcto. Objetivo completado.", wrong: "La jugada es legal, pero no resuelve el ejercicio. Inténtalo de nuevo.",
      hint: "Pista: ", reset: "Posición reiniciada.", noEngine: "No se pudo cargar el tablero 3D.",
      solved: "resueltos", attempts: "intentos", move: "Mueve una pieza en el tablero.",
      goals: { mate: "Encuentra jaque mate en una jugada.", queen: "Captura la dama negra en una jugada.", castle: "Enrócate para poner a tu rey a salvo.", promote: "Promociona el peón a otra pieza." },
      successGoal: { mate: "¡Jaque mate! Encontraste la finalización.", queen: "Dama capturada. Buena visión táctica.", castle: "Enroque realizado. Rey protegido.", promote: "Promoción realizada. El peón llegó a la última fila." },
      daily: "Desafío diario", dailyDone: "Desafío diario completado.", date: "Desafío del "
    },
    "zh-CN": {
      choose: "选择一个局面开始练习。", ready: "轮到你了。找到符合目标的着法。",
      success: "正确！目标已完成。", wrong: "这步棋合法，但没有完成练习目标。再试一次。",
      hint: "提示：", reset: "已重置局面。", noEngine: "无法加载 3D 棋盘。",
      solved: "已完成", attempts: "次尝试", move: "在棋盘上移动一枚棋子。",
      goals: { mate: "一步将死。", queen: "一步吃掉黑方后。", castle: "通过王车易位保护你的王。", promote: "将兵升变为其他棋子。" },
      successGoal: { mate: "将死！你找到了制胜招法。", queen: "成功吃后。战术判断很好。", castle: "王车易位完成，王更安全了。", promote: "升变完成，兵到达底线。" },
      daily: "每日挑战", dailyDone: "今日挑战已完成。", date: "挑战日期："
    }
  }[lang] || null;
  if (!C || !B || !$("training-board")) return;

  const puzzles = [
    { id: "mate-one", fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", from: { r: 0, f: 4 }, to: { r: 7, f: 4 }, goal: "mate", hint: {
      "pt-BR": "A torre pode atravessar a coluna e atacar o rei pela oitava fileira.",
      en: "The rook can travel up the file and attack the king along the back rank.",
      es: "La torre puede subir por la columna y atacar al rey en la última fila.",
      "zh-CN": "留意车沿着 e 线前进，并从底线横向将军。"
    }},
    { id: "win-queen", fen: "4k3/8/8/8/8/8/4q3/4R1K1 w - - 0 1", from: { r: 0, f: 4 }, to: { r: 1, f: 4 }, goal: "queen", hint: {
      "pt-BR": "Observe a dama preta na mesma coluna da sua torre.",
      en: "Look at the black queen on the same file as your rook.",
      es: "Observa la dama negra en la misma columna que tu torre.",
      "zh-CN": "黑后与你的车位于同一条直线上。"
    }},
    { id: "castle", fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", from: { r: 0, f: 4 }, to: { r: 0, f: 6 }, goal: "castle", hint: {
      "pt-BR": "O caminho entre o rei e a torre do lado do rei está livre.",
      en: "The path between your king and kingside rook is clear.",
      es: "El camino entre tu rey y la torre del flanco de rey está libre.",
      "zh-CN": "王与王翼车之间的格子是空的。"
    }},
    { id: "promotion", fen: "4k3/P7/8/8/8/8/8/4K3 w - - 0 1", from: { r: 6, f: 0 }, to: { r: 7, f: 0 }, goal: "promote", hint: {
      "pt-BR": "O peão branco já está a uma casa da última fileira.",
      en: "The white pawn is one square away from the last rank.",
      es: "El peón blanco está a una casilla de la última fila.",
      "zh-CN": "白兵距离底线只有一格。"
    }}
  ];
  const copy = t || {
    choose: "Choose a scenario.", ready: "Your turn.", success: "Correct.", wrong: "Try again.",
    hint: "Hint: ", reset: "Reset.", noEngine: "Board unavailable.", solved: "solved",
    attempts: "attempts", move: "Make a move.", goals: {}, successGoal: {}, daily: "Daily challenge",
    dailyDone: "Completed today.", date: "Challenge for "
  };

  let state = null;
  let current = null;
  let selected = null;
  let legal = [];
  let complete = false;
  let attempts = 0;
  let boardReady = false;
  const dailyMode = document.body.dataset.trainerMode === "daily";
  const storageKey = "3dxess.training.progress.v1";

  function readProgress() {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        solved: Array.isArray(data.solved) ? data.solved : [],
        totalAttempts: Math.max(0, Number(data.totalAttempts) || 0),
        dailyDate: typeof data.dailyDate === "string" ? data.dailyDate : "",
        streak: Math.max(0, Number(data.streak) || 0)
      };
    } catch (_) {
      return { solved: [], totalAttempts: 0, dailyDate: "", streak: 0 };
    }
  }
  let progress = readProgress();

  function writeProgress() {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch (_) { /* storage may be blocked */ }
    updateProgress();
  }
  function localDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }
  function dayNumber(key) {
    const parts = key.split("-").map(Number);
    return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
  }
  function updateProgress() {
    const solvedEl = $("training-solved");
    const attemptsEl = $("training-attempts");
    const streakEl = $("training-streak");
    if (solvedEl) solvedEl.textContent = String(progress.solved.length);
    if (attemptsEl) attemptsEl.textContent = String(progress.totalAttempts);
    if (streakEl) streakEl.textContent = String(progress.streak);
  }
  function setStatus(message, kind) {
    const el = $("training-status");
    if (!el) return;
    el.textContent = message;
    el.dataset.state = kind || "info";
    el.setAttribute("role", kind === "success" ? "status" : "status");
  }
  function selectScenario(id) {
    current = puzzles.find(p => p.id === id) || puzzles[0];
    state = C.fenToState(current.fen);
    selected = null;
    legal = [];
    complete = false;
    attempts = 0;
    document.querySelectorAll("[data-scenario]").forEach(btn => {
      btn.setAttribute("aria-pressed", String(btn.dataset.scenario === current.id));
    });
    if (boardReady) {
      B.setOrientation("w");
      B.setState(state, { selected: null, legalMoves: [], animate: false });
      B.playIntro();
    }
    const title = $("training-current-title");
    const activeButton = document.querySelector('[data-scenario="' + current.id + '"]');
    if (title) title.textContent = dailyMode
      ? copy.daily
      : activeButton && activeButton.querySelector("strong")
        ? activeButton.querySelector("strong").textContent
        : current.id;
    setStatus(copy.goals[current.goal] || copy.ready, "info");
  }
  function goalMet(move, result, nextState) {
    if (current.goal === "mate") return C.computeStatus(nextState).type === "checkmate";
    if (current.goal === "queen") return !!(result.captured && result.captured.type === "q");
    if (current.goal === "castle") return !!move.castle;
    if (current.goal === "promote") return !!move.promotion;
    return false;
  }
  function selectSquare(r, f) {
    if (!current || complete) return;
    const piece = state.board[r][f];
    if (selected) {
      const candidates = legal.filter(m => m.to.r === r && m.to.f === f);
      if (candidates.length) {
        const move = candidates.find(m => m.promotion === "q") || candidates[0];
        attempts += 1;
        progress.totalAttempts += 1;
        const next = C.cloneState(state);
        const result = C.applyMove(next, move);
        if (goalMet(move, result, next)) {
          state = next;
          complete = true;
          selected = null;
          legal = [];
          B.setState(state, {
            lastMove: { from: move.from, to: move.to, castle: move.castle || null, enPassant: !!move.enPassant },
            selected: null, legalMoves: [], animate: true
          });
          B.playEffect(current.goal === "mate" ? "check" :
            current.goal === "queen" ? "capture" :
            current.goal === "promote" ? "promotion" : "move", move.to.r, move.to.f);
          const successMessage = copy.successGoal[current.goal] || copy.success;
          setStatus(successMessage, "success");
          if (!progress.solved.includes(current.id)) progress.solved.push(current.id);
          if (dailyMode) recordDailyCompletion();
        } else {
          setStatus(copy.wrong, "error");
          selected = null;
          legal = [];
          B.setState(state, { selected: null, legalMoves: [], animate: false });
        }
        writeProgress();
        return;
      }
      if (piece && piece.color === state.turn) {
        selected = { r, f };
        legal = C.legalMoves(state).filter(m => m.from.r === r && m.from.f === f);
      } else {
        selected = null;
        legal = [];
      }
    } else if (piece && piece.color === state.turn) {
      selected = { r, f };
      legal = C.legalMoves(state).filter(m => m.from.r === r && m.from.f === f);
    }
    B.setState(state, { selected, legalMoves: legal, animate: false });
  }
  function recordDailyCompletion() {
    const today = localDateKey(new Date());
    if (progress.dailyDate === today) return;
    const yesterday = localDateKey(new Date(Date.now() - 86400000));
    progress.streak = progress.dailyDate === yesterday ? progress.streak + 1 : 1;
    progress.dailyDate = today;
  }
  function resetScenario() {
    if (!current) return;
    state = C.fenToState(current.fen);
    selected = null;
    legal = [];
    complete = false;
    attempts = 0;
    B.setState(state, { selected: null, legalMoves: [], animate: false });
    setStatus(copy.reset + " " + (copy.goals[current.goal] || ""), "info");
  }
  function showHint() {
    if (!current) return;
    const hint = current.hint[lang] || current.hint.en;
    setStatus(copy.hint + hint, "info");
  }
  function init() {
    try {
      B.init($("training-board"));
      boardReady = true;
      B.setEffects(true);
      B.onSquareClick(selectSquare);
      const id = dailyMode ? puzzles[dayNumber(localDateKey(new Date())) % puzzles.length].id :
        (document.querySelector("[data-scenario]")?.dataset.scenario || puzzles[0].id);
      selectScenario(id);
      const dateEl = $("training-date");
      if (dateEl) {
        dateEl.textContent = copy.date + new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(new Date());
      }
      if (dailyMode && progress.dailyDate === localDateKey(new Date())) setStatus(copy.dailyDone, "success");
      $("training-hint")?.addEventListener("click", showHint);
      $("training-reset")?.addEventListener("click", resetScenario);
      updateProgress();
    } catch (error) {
      setStatus(copy.noEngine, "error");
    }
  }
  document.querySelectorAll("[data-scenario]").forEach(btn => {
    btn.addEventListener("click", () => selectScenario(btn.dataset.scenario));
  });
  $("daily-start")?.addEventListener("click", () => {
    const date = localDateKey(new Date());
    const id = puzzles[dayNumber(date) % puzzles.length].id;
    selectScenario(id);
    $("training-board")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();