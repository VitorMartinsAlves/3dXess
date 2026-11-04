/* ============================================================
   Renderizador 2D leve do 3dXess.
   Sem WebGL, canvas, dependências externas ou loop de animação.
   ============================================================ */
(function (global) {
  'use strict';

  const THEMES = {
    classic: { label: 'Clássico', bg: '#0b0f14', light: '#e8dcc6', dark: '#6b4a35', accent: '#6ee7b7', accent2: '#38bdf8' },
    marble: { label: 'Mármore', bg: '#11151c', light: '#f2efe8', dark: '#8b8f98', accent: '#c4b5fd', accent2: '#93c5fd' },
    neon: { label: 'Neon', bg: '#05060a', light: '#172a4a', dark: '#080f1e', accent: '#22d3ee', accent2: '#e879f9' },
    forest: { label: 'Floresta', bg: '#0a1410', light: '#d9c9a3', dark: '#3f6b4a', accent: '#86efac', accent2: '#fde68a' },
    sunset: { label: 'Pôr do sol', bg: '#1a0f14', light: '#f0c9a8', dark: '#8a4b3f', accent: '#fca5a5', accent2: '#fdba74' },
    ice: { label: 'Gelo', bg: '#081018', light: '#dfeef7', dark: '#6b93ad', accent: '#7dd3fc', accent2: '#e0f2fe' }
  };

  const SKINS = {
    classic: { label: 'Clássica' },
    marble: { label: 'Mármore' },
    metal: { label: 'Metal' },
    neon: { label: 'Neon' },
    glass: { label: 'Vidro' },
    wood: { label: 'Madeira' }
  };

  const SYMBOLS = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  const LABELS = {
    'pt-BR': { w: 'branca', b: 'preta', k: 'rei', q: 'dama', r: 'torre', bsh: 'bispo', n: 'cavalo', p: 'peão', square: 'Casa' },
    en: { w: 'white', b: 'black', k: 'king', q: 'queen', r: 'rook', bsh: 'bishop', n: 'knight', p: 'pawn', square: 'Square' },
    es: { w: 'blanca', b: 'negra', k: 'rey', q: 'dama', r: 'torre', bsh: 'alfil', n: 'caballo', p: 'peón', square: 'Casilla' },
    'zh-CN': { w: '白色', b: '黑色', k: '王', q: '后', r: '车', bsh: '象', n: '马', p: '兵', square: '格子' }
  };

  let container = null;
  let root = null;
  let grid = null;
  let squares = [];
  let clickHandler = null;
  let interactive = false;
  let orientation = 'w';
  let currentTheme = 'classic';
  let currentSkin = 'classic';
  let effectsEnabled = false;
  let currentState = null;
  let lastMove = null;
  let selected = null;
  let legalMoves = [];
  let checkSquare = null;

  const language = LABELS[document.documentElement.lang] ? document.documentElement.lang : 'pt-BR';
  const labels = LABELS[language];

  function createBoard(containerElement) {
    container = containerElement;
    if (!container) throw new Error('O contêiner do tabuleiro 2D não existe.');
    container.replaceChildren();

    root = document.createElement('div');
    root.className = 'board2d-shell';
    root.setAttribute('aria-label', language === 'en' ? 'Chessboard' : language === 'es' ? 'Tablero de ajedrez' : language === 'zh-CN' ? '国际象棋棋盘' : 'Tabuleiro de xadrez');

    grid = document.createElement('div');
    grid.className = 'board2d-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', root.getAttribute('aria-label'));

    squares = [];
    for (let viewRow = 0; viewRow < 8; viewRow++) {
      for (let viewCol = 0; viewCol < 8; viewCol++) {
        const square = document.createElement('button');
        square.type = 'button';
        square.className = 'board2d-square';
        square.setAttribute('role', 'gridcell');
        square.dataset.viewRow = String(viewRow);
        square.dataset.viewCol = String(viewCol);
        square.innerHTML = '<span class="board2d-piece" aria-hidden="true"></span>';
        square.addEventListener('click', function () {
          if (!interactive || !clickHandler) return;
          const position = positionForView(Number(square.dataset.viewRow), Number(square.dataset.viewCol));
          clickHandler(position.r, position.f);
        });
        square.addEventListener('keydown', onSquareKeydown);
        grid.appendChild(square);
        squares.push(square);
      }
    }

    root.appendChild(grid);
    container.appendChild(root);
    applyTheme(currentTheme);
    applySkin(currentSkin);
    render();
  }

  function positionForView(viewRow, viewCol) {
    if (orientation === 'b') return { r: 7 - viewRow, f: 7 - viewCol };
    return { r: viewRow, f: viewCol };
  }

  function viewForPosition(r, f) {
    if (orientation === 'b') return { row: 7 - r, col: 7 - f };
    return { row: r, col: f };
  }

  function onSquareKeydown(event) {
    const row = Number(event.currentTarget.dataset.viewRow);
    const col = Number(event.currentTarget.dataset.viewCol);
    let nextRow = row;
    let nextCol = col;
    if (event.key === 'ArrowUp') nextRow -= 1;
    else if (event.key === 'ArrowDown') nextRow += 1;
    else if (event.key === 'ArrowLeft') nextCol -= 1;
    else if (event.key === 'ArrowRight') nextCol += 1;
    else return;

    event.preventDefault();
    nextRow = Math.max(0, Math.min(7, nextRow));
    nextCol = Math.max(0, Math.min(7, nextCol));
    const target = squares[nextRow * 8 + nextCol];
    if (target) target.focus();
  }

  function pieceName(piece) {
    const key = piece.type === 'b' ? 'bsh' : piece.type;
    return labels[key] || piece.type;
  }

  function render() {
    if (!grid || !currentState || !currentState.board) return;
    const files = 'abcdefgh';
    const focused = document.activeElement && document.activeElement.classList.contains('board2d-square')
      ? document.activeElement
      : null;
    const focusedR = focused ? Number(focused.dataset.viewRow) : -1;
    const focusedF = focused ? Number(focused.dataset.viewCol) : -1;

    for (let viewRow = 0; viewRow < 8; viewRow++) {
      for (let viewCol = 0; viewCol < 8; viewCol++) {
        const square = squares[viewRow * 8 + viewCol];
        const pos = positionForView(viewRow, viewCol);
        const piece = currentState.board[pos.r] && currentState.board[pos.r][pos.f];
        const light = (pos.r + pos.f) % 2 === 1;
        const pieceEl = square.firstElementChild;
        const rank = String(8 - pos.r);
        const file = files[pos.f];

        square.classList.toggle('is-light', light);
        square.classList.toggle('is-dark', !light);
        square.classList.toggle('is-selected', !!(selected && selected.r === pos.r && selected.f === pos.f));
        square.classList.toggle('is-last-move', !!(lastMove && (
          (lastMove.from && lastMove.from.r === pos.r && lastMove.from.f === pos.f) ||
          (lastMove.to && lastMove.to.r === pos.r && lastMove.to.f === pos.f)
        )));
        square.classList.toggle('is-check', !!(checkSquare && checkSquare.r === pos.r && checkSquare.f === pos.f));

        const legal = selected && legalMoves.find(function (move) {
          return move.to.r === pos.r && move.to.f === pos.f;
        });
        square.classList.toggle('is-legal', !!legal && !legal.capture);
        square.classList.toggle('is-capture', !!legal && !!legal.capture);

        square.dataset.rank = viewCol === 0 ? rank : '';
        square.dataset.file = viewRow === 7 ? file : '';
        square.dataset.piece = piece ? piece.color + piece.type : '';
        pieceEl.textContent = piece ? (SYMBOLS[piece.color] && SYMBOLS[piece.color][piece.type]) || '' : '';
        pieceEl.className = 'board2d-piece' + (piece ? (piece.color === 'w' ? ' is-white' : ' is-black') : '');

        const coordinate = file + rank;
        const description = piece
          ? labels.square + ' ' + coordinate + ', ' + labels[piece.color] + ' ' + pieceName(piece)
          : labels.square + ' ' + coordinate;
        square.setAttribute('aria-label', description);
        square.disabled = !interactive;
        square.tabIndex = (focusedR === viewRow && focusedF === viewCol) || (!focused && viewRow === 0 && viewCol === 0) ? 0 : -1;
      }
    }
  }

  function applyTheme(name) {
    currentTheme = Object.prototype.hasOwnProperty.call(THEMES, name) ? name : 'classic';
    const theme = THEMES[currentTheme];
    if (!root) return;
    root.style.setProperty('--board2d-bg', theme.bg);
    root.style.setProperty('--board2d-light', theme.light);
    root.style.setProperty('--board2d-dark', theme.dark);
    root.style.setProperty('--board2d-accent', theme.accent);
    root.style.setProperty('--board2d-accent2', theme.accent2);
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--accent-2', theme.accent2);
    document.documentElement.dataset.boardTheme = currentTheme;
  }

  function applySkin(name) {
    currentSkin = Object.prototype.hasOwnProperty.call(SKINS, name) ? name : 'classic';
    if (root) root.dataset.pieceSkin = currentSkin;
  }

  function setState(state, options) {
    options = options || {};
    currentState = state;
    lastMove = options.lastMove || null;
    selected = options.selected || null;
    legalMoves = options.legalMoves || [];
    checkSquare = options.checkSquare || null;
    render();
  }

  function setOrientation(color) {
    orientation = color === 'b' ? 'b' : 'w';
    render();
  }

  function setInteractive(value) {
    interactive = !!value;
    render();
  }

  global.Board2D = {
    THEMES: THEMES,
    SKINS: SKINS,
    init: createBoard,
    setState: setState,
    setTheme: applyTheme,
    setSkin: applySkin,
    setEffects: function (enabled) { effectsEnabled = !!enabled; },
    playIntro: function () {},
    setOrientation: setOrientation,
    setInteractive: setInteractive,
    onSquareClick: function (callback) { clickHandler = callback; },
    playEffect: function () {},
    resetCamera: function () {},
    getTheme: function () { return currentTheme; },
    getSkin: function () { return currentSkin; },
    getOrientation: function () { return orientation; },
    setActive: function (value) { setInteractive(!!value); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
