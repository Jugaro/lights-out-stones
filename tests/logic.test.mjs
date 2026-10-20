/*
 * Тесты чистой логики Lights Out Stones.
 * Запуск: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const L = require('../game.js');
const S = require('../solver.js');

/* ---------- Решатель над GF(2) для проверки решаемости ---------- */

/** A: N x N матрица над GF(2), столбец j = маска нажатия j. Ищем x: A x = b. */
function solveGf2(board, n, mode, target) {
  const N = n * n;
  target = target === undefined ? L.WHITE : target;
  // BigInt: для 7x7 N=49 бит — больше 32-битных операций JS
  const RHS = 1n << BigInt(N);
  const COEFF = RHS - 1n;
  const rows = [];
  for (let i = 0; i < N; i++) {
    let mask = 0n;
    for (let j = 0; j < N; j++) {
      const [r, c] = [Math.floor(j / n), j % n];
      if (L.pressMask(n, r, c, mode).includes(i)) mask |= 1n << BigInt(j);
    }
    if (board[i] !== target) mask |= RHS; // правая часть: отличия от цели
    rows.push(mask);
  }
  const pivots = [];
  let row = 0;
  for (let col = 0; col < N && row < N; col++) {
    const cb = 1n << BigInt(col);
    let piv = -1;
    for (let r = row; r < N; r++) {
      if ((rows[r] & cb) !== 0n) { piv = r; break; }
    }
    if (piv === -1) continue;
    [rows[row], rows[piv]] = [rows[piv], rows[row]];
    for (let r = 0; r < N; r++) {
      if (r !== row && (rows[r] & cb) !== 0n) rows[r] ^= rows[row];
    }
    pivots.push([row, col]);
    row++;
  }
  // несовместность: строка вида 0...0 | 1
  for (let r = 0; r < N; r++) {
    if ((rows[r] & COEFF) === 0n && (rows[r] & RHS) !== 0n) return null;
  }
  // свободные переменные = 0, базисные из строк
  const x = new Array(N).fill(0);
  for (const [r, col] of pivots) x[col] = Number((rows[r] & RHS) >> BigInt(N));
  return x;
}

/** Проверка: применение решения x к доске даёт все камни цвета target. */
function verifySolution(board, n, x, mode, target) {
  let b = board.slice();
  for (let j = 0; j < x.length; j++) {
    if (x[j] === 1) {
      b = L.applyPress(b, n, Math.floor(j / n), j % n, mode);
    }
  }
  return L.isWin(b, target);
}

/* ---------- Тесты ---------- */

test('pressMask: угловой камень переворачивает 3 камня', () => {
  assert.equal(L.pressMask(5, 0, 0).length, 3);
  assert.equal(L.pressMask(5, 4, 4).length, 3);
});

test('pressMask: крайний камень переворачивает 4 камня', () => {
  assert.equal(L.pressMask(5, 0, 2).length, 4);
  assert.equal(L.pressMask(5, 3, 0).length, 4);
});

test('pressMask: внутренний камень переворачивает 5 камней', () => {
  assert.equal(L.pressMask(5, 2, 2).length, 5);
});

test('pressMask: крест — нет диагональных соседей', () => {
  const n = 5;
  const idx = (r, c) => r * n + c;
  const cells = L.pressMask(n, 2, 2);
  const has = (r, c) => cells.includes(idx(r, c));
  assert.ok(has(2, 2) && has(1, 2) && has(3, 2) && has(2, 1) && has(2, 3));
  assert.ok(!has(1, 1) && !has(1, 3) && !has(3, 1) && !has(3, 3));
});

test('applyPress: двойное нажатие — тождество', () => {
  const b0 = L.generateBoard(5, 7, L.makeRng(42));
  const once = L.applyPress(b0, 5, 1, 3);
  const twice = L.applyPress(once, 5, 1, 3);
  assert.deepEqual(twice, b0);
});

test('applyPress: не мутирует исходную доску', () => {
  const b0 = L.generateBoard(5, 5, L.makeRng(7));
  const copy = b0.slice();
  L.applyPress(b0, 5, 0, 0);
  assert.deepEqual(b0, copy);
});

test('isWin: решённая доска — победа, одно нажатие — нет', () => {
  assert.ok(L.isWin(L.createSolvedBoard(5)));
  assert.ok(!L.isWin(L.applyPress(L.createSolvedBoard(5), 5, 2, 2)));
});

test('generateBoard: все позиции решаемы (3x3, 5x5, 7x7)', () => {
  const cases = [[3, 5], [5, 10], [7, 15]]; // [размер, число нажатий]
  for (const [n, presses] of cases) {
    for (let seed = 1; seed <= 8; seed++) {
      const board = L.generateBoard(n, presses, L.makeRng(seed * 1000 + n));
      const x = solveGf2(board, n);
      assert.ok(x !== null, `нераешаемая позиция n=${n} seed=${seed}`);
      assert.ok(verifySolution(board, n, x), `решение не верифицируется n=${n} seed=${seed}`);
    }
  }
});

test('generateBoard: стартовая позиция не является уже решённой', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const board = L.generateBoard(5, 12, L.makeRng(seed));
    assert.ok(!L.isWin(board), `позиция уже решена seed=${seed}`);
  }
});

/* ---------- Режим «лучи»: вся строка и весь столбец ---------- */

test('pressMask rays: размер = строка + столбец − 1 пересечение', () => {
  assert.equal(L.pressMask(5, 2, 2, 'rays').length, 9);
  assert.equal(L.pressMask(5, 0, 4, 'rays').length, 9);
  assert.equal(L.pressMask(3, 1, 0, 'rays').length, 5);
});

test('pressMask rays: вся строка и весь столбец, без лишних', () => {
  const n = 5;
  const idx = (r, c) => r * n + c;
  const cells = L.pressMask(n, 1, 3, 'rays');
  for (let k = 0; k < n; k++) {
    assert.ok(cells.includes(idx(1, k)), `строка: клетка 1-${k}`);
    assert.ok(cells.includes(idx(k, 3)), `столбец: клетка ${k}-3`);
  }
  assert.ok(!cells.includes(idx(0, 0)), 'вне строки и столбца не входит');
  assert.equal(new Set(cells).size, cells.length, 'пересечение учтено один раз');
});

test('applyPress rays: двойное нажатие — тождество', () => {
  const b0 = L.generateBoard(5, 5, L.makeRng(11), 'rays');
  const once = L.applyPress(b0, 5, 2, 0, 'rays');
  const twice = L.applyPress(once, 5, 2, 0, 'rays');
  assert.deepEqual(twice, b0);
});

test('applyPress rays: не мутирует исходную доску', () => {
  const b0 = L.generateBoard(5, 5, L.makeRng(13), 'rays');
  const copy = b0.slice();
  L.applyPress(b0, 5, 4, 4, 'rays');
  assert.deepEqual(b0, copy);
});

test('generateBoard rays: все позиции решаемы (3x3, 5x5, 7x7)', () => {
  const cases = [[3, 3], [5, 4], [7, 5]];
  for (const [n, presses] of cases) {
    for (let seed = 1; seed <= 8; seed++) {
      const board = L.generateBoard(n, presses, L.makeRng(seed * 700 + n), 'rays');
      const x = solveGf2(board, n, 'rays');
      assert.ok(x !== null, `нераешаемая позиция rays n=${n} seed=${seed}`);
      assert.ok(verifySolution(board, n, x, 'rays'), `решение не верифицируется rays n=${n} seed=${seed}`);
    }
  }
});

/* ---------- Цель «чёрные»: победа — все камни чёрные ---------- */

test('isWin: с целью black решённая доска — все чёрные', () => {
  assert.ok(L.isWin(L.createSolvedBoard(5, L.BLACK), L.BLACK));
  assert.ok(!L.isWin(L.createSolvedBoard(5), L.BLACK));
  assert.ok(!L.isWin(L.createSolvedBoard(5, L.BLACK)));
});

test('generateBoard с целью black: старт нерешён, позиции решаемы (оба режима)', () => {
  for (const mode of ['cross', 'rays']) {
    for (let seed = 1; seed <= 8; seed++) {
      const board = L.generateBoard(5, 8, L.makeRng(seed * 31), mode, L.BLACK);
      assert.ok(!L.isWin(board, L.BLACK), `старт уже решён mode=${mode} seed=${seed}`);
      const x = solveGf2(board, 5, mode, L.BLACK);
      assert.ok(x !== null, `нераешаемая позиция mode=${mode} seed=${seed}`);
      assert.ok(verifySolution(board, 5, x, mode, L.BLACK), `решение не верифицируется mode=${mode} seed=${seed}`);
    }
  }
});

test('generateBoard с целью black: повтор исходных нажатий возвращает к чёрным (детерминированно)', () => {
  // доска из всех чёрных + одно нажатие → одно нажатие там же решает
  const scrambled = L.applyPress(L.createSolvedBoard(4, L.BLACK), 4, 1, 2, 'rays');
  assert.ok(!L.isWin(scrambled, L.BLACK));
  const solved = L.applyPress(scrambled, 4, 1, 2, 'rays');
  assert.ok(L.isWin(solved, L.BLACK));
});

/** Нажатия с нечётной кратностью: только их повтор решает доску (двойное нажатие — тождество). */
function oddPresses(presses, n) {
  const parity = new Map();
  for (const [r, c] of presses) {
    const k = r * n + c;
    parity.set(k, !parity.get(k));
  }
  const out = [];
  for (const [k, odd] of parity) if (odd) out.push([Math.floor(k / n), k % n]);
  return out;
}

/* ---------- Режим «Диагонали» ---------- */

test('pressMask diagonals: угол переворачивает ровно одну диагональ (n камней)', () => {
  for (const n of [3, 5, 7]) {
    const mask = L.pressMask(n, 0, 0, 'diagonals');
    assert.equal(mask.length, n);
    for (let k = 0; k < n; k++) assert.ok(mask.includes(k * n + k), `нет клетки ${k},${k}`);
  }
});

test('pressMask diagonals: центр 5×5 переворачивает 9 камней (обе диагонали)', () => {
  const mask = L.pressMask(5, 2, 2, 'diagonals');
  assert.equal(mask.length, 9);
  assert.ok(mask.includes(2 * 5 + 2));
  assert.ok(mask.includes(0));
  assert.ok(mask.includes(24));
  assert.ok(mask.includes(4));
  assert.ok(mask.includes(20));
  assert.ok(!mask.includes(7));   // сосед по вертикали — не диагональ
});

test('applyPress diagonals: двойное нажатие — тождество', () => {
  const b0 = L.generateBoard(5, 5, L.makeRng(7), 'diagonals');
  const b1 = L.applyPress(b0, 5, 1, 3, 'diagonals');
  const b2 = L.applyPress(b1, 5, 1, 3, 'diagonals');
  assert.deepEqual(b2, b0);
});

test('generateBoard diagonals: повтор записанных нажатий решает доску', () => {
  const presses = [];
  const board = L.generateBoard(7, 6, L.makeRng(42), 'diagonals', L.WHITE, { presses });
  assert.ok(!L.isWin(board));
  let b = board;
  for (const [r, c] of oddPresses(presses, 7)) b = L.applyPress(b, 7, r, c, 'diagonals');
  assert.ok(L.isWin(b));
});

/* ---------- Препятствия (сердцевины) ---------- */

test('applyPress с блоками: сердцевины не переворачиваются', () => {
  const n = 5;
  const blocks = [0, 12, 24];
  const b0 = new Array(n * n).fill(L.BLACK);   // все чёрные
  const b1 = L.applyPress(b0, n, 2, 2, 'rays', blocks);
  for (const x of blocks) assert.equal(b1[x], L.BLACK, `блок ${x} перевернулся`);
  assert.equal(b1[2 * n + 1], L.WHITE);        // сосед перевернулся
});

test('generateBoard с блоками: позиция решаема повтором записанных нажатий', () => {
  const n = 5;
  const blocks = [6, 7, 17, 18];
  const presses = [];
  const board = L.generateBoard(n, 6, L.makeRng(11), 'cross', L.WHITE, { blocks, presses });
  assert.ok(!L.isWin(board));
  let b = board;
  for (const [r, c] of oddPresses(presses, n)) b = L.applyPress(b, n, r, c, 'cross', blocks);
  assert.ok(L.isWin(b));
  for (const x of blocks) assert.equal(b[x], L.WHITE, `блок ${x} сменил цвет`);
});

test('isWin с блоками: закрытые клетки не учитываются', () => {
  const n = 5;
  const blocks = [0, 12, 24];
  // все видимые белые, все закрытые чёрные — победа
  const b = new Array(n * n).fill(L.WHITE);
  for (const x of blocks) b[x] = L.BLACK;
  assert.ok(L.isWin(b, L.WHITE, blocks));
  // одна видимая чёрная — не победа
  b[7] = L.BLACK;
  assert.ok(!L.isWin(b, L.WHITE, blocks));
  // без списка блоков та же доска — не победа
  assert.ok(!L.isWin(b, L.WHITE));
});

/* ---------- Гарантии решаемости (регрессия: софтлок и недостижимые ★★★) ---------- */

test('generateBoard с блоками: генерация не нажимает сердцевины', () => {
  for (const mode of L.MODES) {
    for (const n of [5, 7]) {
      const rng = L.makeRng(n * 977);
      const blocks = [0, 4, n * n - 1, 2 * n + 2];
      const presses = [];
      L.generateBoard(n, 20, rng, mode, L.WHITE, { blocks, presses });
      for (const [r, c] of presses) {
        assert.ok(!blocks.includes(r * n + c), `${mode} n=${n}: нажата сердцевина ${r},${c}`);
      }
    }
  }
});

test('generateBoard с блоками: доска решаема только разрешёнными нажатиями (все режимы)', () => {
  for (const mode of L.MODES) {
    for (const n of [5, 7]) {
      for (let seed = 1; seed <= 20; seed++) {
        const rng = L.makeRng(seed * 977 + n);
        const blocks = Array.from({ length: 3 }, () => Math.floor(rng() * n * n));
        const board = L.generateBoard(n, 6, rng, mode, L.WHITE, { blocks });
        const sol = S.minWeight(board, n, mode, L.WHITE, blocks, L);
        assert.ok(sol !== null, `нерешаема в UI: ${mode} n=${n} seed=${seed}`);
        let b = board.slice();
        for (const [r, c] of sol.presses) b = L.applyPress(b, n, r, c, mode, blocks);
        assert.ok(L.isWin(b, L.WHITE, blocks), `решение не верифицируется: ${mode} n=${n}`);
      }
    }
  }
});

test('баланс: цикл перегенерации newGame даёт минимум ≤ нормы за ≤ 20 попыток (★★★ достижимы)', () => {
  // Повторяет логику отбраковки из newGame (index.html): доска принимается,
  // только если её точный минимум не длиннее par. Исторически проблемный
  // режим — «Крест» (единственное решение на 7×7 не влезало в норму).
  const PAR = { 3: { easy: 3, medium: 5, hard: 7 }, 5: { easy: 5, medium: 8, hard: 11 }, 7: { easy: 8, medium: 12, hard: 16 } };
  const RANGE = { easy: { 3: [2, 3], 5: [4, 6], 7: [6, 9] }, medium: { 3: [4, 6], 5: [8, 12], 7: [12, 16] }, hard: { 3: [7, 9], 5: [14, 18], 7: [18, 24] } };
  for (const n of [3, 5, 7]) {
    for (const diff of ['easy', 'medium', 'hard']) {
      const par = PAR[n][diff];
      const range = RANGE[diff][n];
      for (let seed = 1; seed <= 30; seed++) {
        const rng = L.makeRng(seed * 131 + n * 17 + diff.length);
        let board = null, sol = null, tries = 0;
        do {
          const num = range[0] + Math.floor(rng() * (range[1] - range[0] + 1));
          board = L.generateBoard(n, num, rng, 'cross', L.WHITE, {});
          sol = S.minWeight(board, n, 'cross', L.WHITE, [], L);
          tries++;
        } while ((sol === null || sol.weight > par || L.isWin(board)) && tries < 20);
        assert.ok(sol !== null && sol.weight <= par && !L.isWin(board),
          `cross n=${n} ${diff} seed=${seed}: за ${tries} попыток не выдана доска с минимумом ≤ ${par}`);
      }
    }
  }
});
