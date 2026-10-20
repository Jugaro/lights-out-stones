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

  /**
   * Решённая доска: все камни цвета target (по умолчанию белые).
   * Плоский массив длины n*n, row-major.
   */
  function createSolvedBoard(n, target) {
    target = target === undefined ? WHITE : target;
    var b = new Array(n * n);
    for (var i = 0; i < b.length; i++) b[i] = target;
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

  /**
   * Позиции, которые переворачивает нажатие на (r, c).
   * mode 'cross' — классика: сам камень + соседи по вертикали/горизонтали.
   * mode 'rays' — вся строка r и весь столбец c (пересечение — один раз).
   * mode 'diagonals' — обе диагонали, проходящие через камень.
   */
  function pressMask(n, r, c, mode) {
    mode = mode || 'cross';
    if (mode === 'rays') {
      var out = [];
      var seen = {};
      for (var k = 0; k < n; k++) {
        var a = r * n + k;
        var b = k * n + c;
        if (!seen[a]) { seen[a] = 1; out.push(a); }
        if (!seen[b]) { seen[b] = 1; out.push(b); }
      }
      return out;
    }
    if (mode === 'diagonals') {
      var out2 = [];
      var seen2 = {};
      for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
          if (Math.abs(r - i) === Math.abs(c - j)) {
            var x = i * n + j;
            if (!seen2[x]) { seen2[x] = 1; out2.push(x); }
          }
        }
      }
      return out2;
    }
    return neighbors(n, r, c).map(function (p) { return p[0] * n + p[1]; });
  }

  /**
   * Применить нажатие: вернуть НОВУЮ доску, где затронутые камни
   * сменили цвет. Исходная доска не мутируется.
   * blocks — опциональный массив индексов «сердцевин»: такие камни
   * никогда не переворачиваются (препятствия на доске).
   */
  function applyPress(board, n, r, c, mode, blocks) {
    var next = board.slice();
    var cells = pressMask(n, r, c, mode);
    for (var i = 0; i < cells.length; i++) {
      if (blocks && blocks.indexOf(cells[i]) >= 0) continue;
      next[cells[i]] = next[cells[i]] === BLACK ? WHITE : BLACK;
    }
    return next;
  }

  /** Решена ли доска: все видимые камни цвета target (по умолчанию белые).
   * Клетки из blocks (препятствия) не проверяются — их цвет скрыт. */
  function isWin(board, target, blocks) {
    target = target === undefined ? WHITE : target;
    for (var i = 0; i < board.length; i++) {
      if (blocks && blocks.indexOf(i) >= 0) continue;
      if (board[i] !== target) return false;
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
   * к решённой доске (все камни цвета target) применяется numPresses
   * случайных нажатий. Такая позиция решаема теми же нажатиями
   * (порядок не важен, повторное нажатие — тождество).
   * Работает для любого режима и любой цели.
   * opts.blocks — препятствия (не переворачиваются);
   * opts.presses — массив, куда записываются все нажатия [r, c]
   * (нужно, например, чтобы задать лимит ходов вызова дня).
   */
  function generateBoard(n, numPresses, rng, mode, target, opts) {
    rng = rng || Math.random;
    opts = opts || {};
    var board = createSolvedBoard(n, target);
    for (var k = 0; k < numPresses; k++) {
      var r = Math.floor(rng() * n);
      var c = Math.floor(rng() * n);
      // сердцевины не нажимаются в UI — и в генерации не должны:
      // иначе доска может оказаться нерешаемой разрешёнными нажатиями
      if (opts.blocks && opts.blocks.indexOf(r * n + c) >= 0) { k--; continue; }
      if (opts.presses) opts.presses.push([r, c]);
      board = applyPress(board, n, r, c, mode, opts.blocks);
    }
    return board;
  }

  return {
    WHITE: WHITE,
    BLACK: BLACK,
    MODES: ['cross', 'rays', 'diagonals'],
    createSolvedBoard: createSolvedBoard,
    pressMask: pressMask,
    applyPress: applyPress,
    isWin: isWin,
    generateBoard: generateBoard,
    makeRng: makeRng
  };
});
