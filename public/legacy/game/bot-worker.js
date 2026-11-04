/* Worker do bot: mantém a busca fora da thread da interface. */
importScripts('engine.js', 'bot.js');

self.onmessage = function (event) {
  const data = event.data || {};
  if (data.type !== 'move') return;

  try {
    const state = self.Chess.fenToState(data.fen);
    const result = self.Bot.chooseMove(state, data.options || {});
    self.postMessage({
      id: data.id,
      ok: true,
      uci: result ? result.uci : null,
      info: result ? result.info : null,
    });
  } catch (error) {
    self.postMessage({
      id: data.id,
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
};
