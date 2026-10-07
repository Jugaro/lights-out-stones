/*
 * Lights Out Stones — чистая логика игры.
 * Намеренно без DOM и ES-модулей: классический скрипт, чтобы работать
 * при открытии index.html с file:// (ES-модули там блокируются CORS),
 * и одновременно загружаться в Node для тестов через module.exports.
 */
(function (root, factory) {
  var lib = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = lib;
  }
  root.LightsOutLogic = lib;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var WHITE = 0;
  var BLACK = 1;

  /** Решённая доска: все камни белые. Плоский массив длины n*n, row-major. */
  function createSolvedBoard(n) {
    var b = new Array(n * n);
    for (var i = 0; i < b.length; i++) b[i] = WHITE;
    return b;
  }

  function neighbors(n, r, c) {
    var out = [[r, c]];
    if (r > 0) out.push([r - 1, c]);
    if (r < n - 1) out.push([r + 1, c]);
    if (c > 0) out.push([r, c - 1]);
    if (c < n - 1) out.push([r, c + 1]);
    return out;
  }

  /** Позиции, которые переворачивает нажатие на (r, c) — крест. */
  function pressMask(n, r, c) {
    return neighbors(n, r, c).map(function (p) { return p[0] * n + p[1]; });
  }

  /**
   * Применить нажатие: вернуть НОВУЮ доску, где камень (r, c)
   * и его соседи по вертикали/горизонтали сменили цвет.
   * Исходная доска не мутируется.
   */
  function applyPress(board, n, r, c) {
    var next = board.slice();
    var cells = pressMask(n, r, c);
    for (var i = 0; i < cells.length; i++) {
      next[cells[i]] = next[cells[i]] === BLACK ? WHITE : BLACK;
    }
    return next;
  }

  /** Решена ли доска: все камни белые. */
  function isWin(board) {
    for (var i = 0; i < board.length; i++) {
      if (board[i] !== WHITE) return false;
    }
    return true;
  }

  /** Детерминированный PRNG (mulberry32) — для воспроизводимых тестов. */
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Генерация ГАРАНТИРОВАННО решаемой позиции:
   * к решённой доске применяется numPresses случайных нажатий.
   * Такая позиция решаема теми же нажатиями (порядок не важен,
   * повторное нажатие — тождество).
   */
  function generateBoard(n, numPresses, rng) {
    rng = rng || Math.random;
    var board = createSolvedBoard(n);
    for (var k = 0; k < numPresses; k++) {
      var r = Math.floor(rng() * n);
      var c = Math.floor(rng() * n);
      board = applyPress(board, n, r, c);
    }
    return board;
  }

  return {
    WHITE: WHITE,
    BLACK: BLACK,
    createSolvedBoard: createSolvedBoard,
    pressMask: pressMask,
    applyPress: applyPress,
    isWin: isWin,
    generateBoard: generateBoard,
    makeRng: makeRng
  };
});
