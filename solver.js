/*
 * Lights Out Stones — GF(2)-решатель: точный минимальный вес решения.
 * UMD, как в game.js: браузер (window.LOSolver) + Node (module.exports).
 *
 * Использование:
 *   var s = LOSolver.minWeight(board, n, mode, target, blocks, LightsOutLogic);
 *   s = { weight: число нажатий в минимальном решении,
 *         presses: [[r,c],...] — одно из минимальных решений,
 *         nullity: размерность нуль-пространства,
 *         exact: true, если вес точный (иначе — верхняя оценка) }
 *
 * При nullity > MAX_ENUM (18) вес — каноническое решение (свободные = 0),
 * что всегда НЕ больше истинного минимума, значит проверка «min > par»
 * остаётся консервативно корректной.
 */
(function (root, factory) {
  var lib = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = lib;
  }
  root.LOSolver = lib;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var MAX_ENUM = 18;   // перебор до 2^18 = 262144 комбинаций — мгновенно

  /**
   * board — плоский массив длины n*n (0 белый, 1 чёрный);
   * target — цвет победы (0/1); blocks — индексы сердцевин (могут отсутствовать);
   * L — библиотека LightsOutLogic (нужен pressMask).
   */
  function minWeight(board, n, mode, target, blocks, L) {
    target = target === undefined ? 0 : target;
    blocks = blocks || [];
    var N = n * n;
    var blocked = {};
    blocks.forEach(function (b) { blocked[b] = 1; });

    // переменные = нажатия на НЕзаблокированные клетки
    var vars = [];
    for (var j = 0; j < N; j++) if (!blocked[j]) vars.push(j);
    var V = vars.length;
    var varPos = {};
    vars.forEach(function (cell, k) { varPos[cell] = k; });

    // уравнения = видимые клетки; коэффициент 1, если маска нажатия накрывает клетку
    var RHS = 1n << BigInt(V);
    var COEFF = RHS - 1n;
    var rows = [];
    for (var i = 0; i < N; i++) {
      if (blocked[i]) continue;
      var mask = 0n;
      for (var k = 0; k < V; k++) {
        var cell = vars[k];
        if (L.pressMask(n, Math.floor(cell / n), cell % n, mode).indexOf(i) >= 0) {
          mask |= 1n << BigInt(k);
        }
      }
      if (board[i] !== target) mask |= RHS;
      rows.push(mask);
    }

    // Гаусс–Жордан над GF(2) (как в tests/logic.test.mjs)
    var pivots = [];
    var row = 0;
    for (var col = 0; col < V && row < rows.length; col++) {
      var cb = 1n << BigInt(col);
      var piv = -1;
      for (var r = row; r < rows.length; r++) {
        if ((rows[r] & cb) !== 0n) { piv = r; break; }
      }
      if (piv === -1) continue;
      var t = rows[row]; rows[row] = rows[piv]; rows[piv] = t;
      for (r = 0; r < rows.length; r++) {
        if (r !== row && (rows[r] & cb) !== 0n) rows[r] ^= rows[row];
      }
      pivots.push([row, col]);
      row++;
    }
    for (r = 0; r < rows.length; r++) {
      if ((rows[r] & COEFF) === 0n && (rows[r] & RHS) !== 0n) return null;   // несовместно
    }

    var pivotCols = {};
    pivots.forEach(function (p) { pivotCols[p[1]] = 1; });
    var freeCols = [];
    for (var c = 0; c < V; c++) if (!pivotCols[c]) freeCols.push(c);

    var x0 = 0n;
    pivots.forEach(function (p) {
      if ((rows[p[0]] & RHS) !== 0n) x0 |= 1n << BigInt(p[1]);
    });

    function weight(x) {
      var w = 0;
      while (x) { x &= x - 1n; w++; }
      return w;
    }

    var wmin = weight(x0);
    var xmin = x0;
    var exact = true;
    var nullity = freeCols.length;

    if (nullity <= MAX_ENUM) {
      // базис нуль-пространства
      var basis = freeCols.map(function (f) {
        var v = 1n << BigInt(f);
        var fb = 1n << BigInt(f);
        pivots.forEach(function (p) {
          if ((rows[p[0]] & fb) !== 0n) v |= 1n << BigInt(p[1]);
        });
        return v;
      });
      for (var combo = 1; combo < (1 << nullity); combo++) {
        var v = 0n;
        for (var b = 0; b < nullity; b++) {
          if (combo & (1 << b)) v ^= basis[b];
        }
        var w = weight(x0 ^ v);
        if (w < wmin) { wmin = w; xmin = x0 ^ v; }
      }
    } else {
      exact = false;   // вес канонического решения — верхняя граница минимума
    }

    var presses = [];
    for (var k2 = 0; k2 < V; k2++) {
      if ((xmin >> BigInt(k2)) & 1n) {
        var cell2 = vars[k2];
        presses.push([Math.floor(cell2 / n), cell2 % n]);
      }
    }
    return { weight: wmin, presses: presses, nullity: nullity, exact: exact };
  }

  return { minWeight: minWeight, MAX_ENUM: MAX_ENUM };
});
