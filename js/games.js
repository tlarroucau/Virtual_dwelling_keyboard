/**
 * games.js — Games page controller
 * Games page controller with dwell-click support.
 */

(function () {
    'use strict';

    // ========================================================
    // Stored settings (shared with main app)
    // ========================================================
    let dwellTime = 800;
    let cooldownTime = 400;
    let dwellEnabled = true;
    let soundEnabled = true;
    let arrowNavEnabled = false;
    let arrowFocusDwellEnabled = false;
    let arrowNavSingleStepEnabled = false;
    let dwellCooldownUntil = 0;
    let lastActivationKey = '';
    let lastActivationAt = 0;
    const DOUBLE_CLICK_SUPPRESSION_MS = 500;

    function loadStoredSettings() {
        try {
            const raw = localStorage.getItem('vdkSettings');
            if (!raw) return;
            const s = JSON.parse(raw);

            if (s.theme) document.body.setAttribute('data-theme', s.theme);
            if (s.keySize) document.body.setAttribute('data-key-size', s.keySize);
            if (s.fontBoost) document.body.setAttribute('data-font-boost', s.fontBoost);
            if (s.emojiSize) document.body.setAttribute('data-emoji-size', s.emojiSize);
            if (s.dwellTime) dwellTime = parseInt(s.dwellTime);
            if (s.cooldownTime) cooldownTime = parseInt(s.cooldownTime);
            if (s.dwellEnabled != null) dwellEnabled = s.dwellEnabled;
            if (s.soundEnabled != null) soundEnabled = s.soundEnabled;
            if (s.arrowNavEnabled != null) arrowNavEnabled = s.arrowNavEnabled;
            if (s.arrowFocusDwellEnabled != null) arrowFocusDwellEnabled = s.arrowFocusDwellEnabled;
            if (s.arrowNavSingleStepEnabled != null) arrowNavSingleStepEnabled = s.arrowNavSingleStepEnabled;
        } catch (e) { /* ignore */ }
    }

    function isDwellCoolingDown() {
        return Date.now() < dwellCooldownUntil;
    }

    function startDwellCooldown() {
        dwellCooldownUntil = Date.now() + Math.max(100, cooldownTime);
    }

    /**
     * Return a stable identity for a dwell/click target across re-renders.
     * @param {HTMLElement} el
     * @returns {string}
     */
    function getActivationKey(el) {
        if (!el) return '';

        const parts = [
            el.id,
            el.dataset.cardId,
            el.dataset.solKind,
            el.dataset.solCol,
            el.dataset.solIndex,
            el.dataset.solSuit,
            el.dataset.row,
            el.dataset.col,
            el.getAttribute('aria-label'),
        ].filter(Boolean);

        return parts.join('|');
    }

    /**
     * Return true when an activation repeats the same target during a double-click.
     * @param {PointerEvent} event
     * @param {HTMLElement} el
     * @returns {boolean}
     */
    function isRepeatedClick(event, el) {
        const key = getActivationKey(el);
        const now = Date.now();
        const repeatsLastActivation = key && key === lastActivationKey &&
            now - lastActivationAt < DOUBLE_CLICK_SUPPRESSION_MS;

        if (event.detail > 1 || repeatsLastActivation) return true;

        lastActivationKey = key;
        lastActivationAt = now;
        return false;
    }

    /**
     * Attach dwell + click to any button element.
     * @param {HTMLElement} btn
     * @param {Function} action
     */
    function attachDwell(btn, action) {
        let timer = null;

        btn.addEventListener('pointerenter', () => {
            if (!dwellEnabled) return;
            if (isDwellCoolingDown()) return;
            startDwellVisual(btn);
            timer = setTimeout(() => {
                resetDwellVisual(btn);
                action();
                playSound();
                startDwellCooldown();
            }, dwellTime);
        });

        btn.addEventListener('pointerleave', () => {
            resetDwellVisual(btn);
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        });

        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            resetDwellVisual(btn);
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            if (isRepeatedClick(e, btn)) return;

            action();
            playSound();
            startDwellCooldown();
        });
    }

    function playSound() {
        if (!soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) { /* ignore */ }
    }

    function startDwellVisual(el) {
        if (!el) return;

        el.classList.add('dwelling');

        const fill = el.querySelector('.dwell-fill');
        if (fill) {
            fill.style.transition = 'none';
            fill.style.width = '0%';
            fill.getBoundingClientRect();
            fill.style.transition = `width ${dwellTime}ms linear`;
            fill.style.width = '100%';
        }
    }

    function resetDwellVisual(el) {
        if (!el) return;

        el.classList.remove('dwelling');

        const fill = el.querySelector('.dwell-fill');
        if (fill) {
            fill.style.transition = 'none';
            fill.style.width = '0%';
        }
    }

    // ========================================================
    // Navigation: game selector <-> game area
    // ========================================================
    const gameSelector = document.getElementById('game-selector');
    const sudokuArea = document.getElementById('sudoku-area');
    const solitarioArea = document.getElementById('solitario-area');

    /**
     * Mark which game layout is active so CSS can optimize each screen.
     * @param {'selector'|'sudoku'|'solitario'} mode
     */
    function setGameLayoutMode(mode) {
        document.body.classList.toggle('sudoku-game-active', mode === 'sudoku');
        document.body.classList.toggle('solitario-game-active', mode === 'solitario');
    }

    function showSelector() {
        setGameLayoutMode('selector');
        gameSelector.style.display = '';
        sudokuArea.style.display = 'none';
        solitarioArea.style.display = 'none';
        clearArrowNavFocus();
        renderGameToText();
    }

    function showSudoku() {
        setGameLayoutMode('sudoku');
        gameSelector.style.display = 'none';
        sudokuArea.style.display = '';
        solitarioArea.style.display = 'none';
        if (!sudokuInitialized) initSudoku();
        clearArrowNavFocus();
        renderGameToText();
    }

    function showSolitario() {
        setGameLayoutMode('solitario');
        gameSelector.style.display = 'none';
        sudokuArea.style.display = 'none';
        solitarioArea.style.display = '';
        if (!solitarioInitialized) initSolitario();
        clearArrowNavFocus();
        renderGameToText();
    }

    // ========================================================
    // SUDOKU ENGINE
    // ========================================================
    let sudokuInitialized = false;
    let sudokuSolution = [];
    let sudokuBoard = [];       // current player board
    let sudokuGiven = [];       // boolean 9x9 — true if pre-filled
    let selectedCell = null;    // { row, col }

    const sudokuBoardEl = document.getElementById('sudoku-board');
    const sudokuNumpadEl = document.getElementById('sudoku-numpad');
    const sudokuMessage = document.getElementById('sudoku-message');

    /**
     * Generate a solved Sudoku board using backtracking.
     */
    function generateSolvedBoard() {
        const board = Array.from({ length: 9 }, () => Array(9).fill(0));

        function isValid(board, row, col, num) {
            for (let i = 0; i < 9; i++) {
                if (board[row][i] === num) return false;
                if (board[i][col] === num) return false;
            }
            const br = Math.floor(row / 3) * 3;
            const bc = Math.floor(col / 3) * 3;
            for (let r = br; r < br + 3; r++) {
                for (let c = bc; c < bc + 3; c++) {
                    if (board[r][c] === num) return false;
                }
            }
            return true;
        }

        function solve(board) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (board[r][c] === 0) {
                        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                        for (const n of nums) {
                            if (isValid(board, r, c, n)) {
                                board[r][c] = n;
                                if (solve(board)) return true;
                                board[r][c] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        }

        solve(board);
        return board;
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Create a puzzle by removing cells from a solved board.
     * @param {number[][]} solved
     * @param {number} clues — number of cells to keep visible (30–40 for medium)
     */
    function createPuzzle(solved, clues) {
        const board = solved.map(row => [...row]);
        const given = Array.from({ length: 9 }, () => Array(9).fill(true));
        const positions = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                positions.push([r, c]);
            }
        }
        shuffle(positions);

        let removed = 0;
        const toRemove = 81 - clues;
        for (const [r, c] of positions) {
            if (removed >= toRemove) break;
            board[r][c] = 0;
            given[r][c] = false;
            removed++;
        }

        return { board, given };
    }

    function initSudoku() {
        sudokuInitialized = true;
        newSudokuGame();
        buildNumpad();
    }

    function newSudokuGame() {
        sudokuMessage.textContent = '';
        selectedCell = null;
        sudokuSolution = generateSolvedBoard();
        const puzzle = createPuzzle(sudokuSolution, 35);
        sudokuBoard = puzzle.board;
        sudokuGiven = puzzle.given;
        renderSudokuBoard();
    }

    function renderSudokuBoard() {
        sudokuBoardEl.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'sudoku-cell';
                cell.setAttribute('data-row', r);
                cell.setAttribute('data-col', c);

                if (sudokuGiven[r][c]) {
                    cell.classList.add('given');
                    cell.textContent = sudokuBoard[r][c];
                } else {
                    cell.textContent = sudokuBoard[r][c] || '';
                    if (sudokuBoard[r][c]) cell.classList.add('user-value');
                }

                // Add dwell fill
                const fill = document.createElement('div');
                fill.className = 'dwell-fill';
                cell.appendChild(fill);

                // Attach dwell for cell selection
                const row = r, col = c;
                attachDwell(cell, () => selectSudokuCell(row, col));

                sudokuBoardEl.appendChild(cell);
            }
        }
    }

    function selectSudokuCell(row, col) {
        // Remove previous selection
        sudokuBoardEl.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

        selectedCell = { row, col };
        const idx = row * 9 + col;
        const cell = sudokuBoardEl.children[idx];
        cell.classList.add('selected');

        // Keep arrow-navigation state in sync so arrow keys move from this cell
        // even when the user selected it via mouse/dwell rather than arrow nav.
        syncArrowNavToSudokuCell(cell);
    }

    /**
     * Resolve the next element to focus given a starting element and an arrow
     * direction, using strict row/column logic across the board and numpad.
     *
     * Layout assumptions:
     *  - Board: 9x9 grid of .sudoku-cell, indexed by data-row/data-col.
     *  - Numpad: 3-column grid of .numpad-btn — buttons "1".."9" form 3 rows
     *    of 3 (1,2,3 / 4,5,6 / 7,8,9), with the "Borrar" button on a 4th row
     *    in column 0.
     *
     * Returns the next focusable element or null if no move is possible.
     */
    function resolveSudokuNavTarget(startEl, direction) {
        if (!startEl) return null;

        const cellAt = (r, c) => {
            if (r < 0 || r > 8 || c < 0 || c > 8) return null;
            return sudokuBoardEl.children[r * 9 + c] || null;
        };
        const numpadBtns = Array.from(sudokuNumpadEl.querySelectorAll('.numpad-btn'));
        // Number buttons 1..9 in row-major order, then Borrar at row 3 col 0.
        const numpadAt = (nr, nc) => {
            if (nr >= 0 && nr <= 2 && nc >= 0 && nc <= 2) {
                return numpadBtns[nr * 3 + nc] || null;
            }
            if (nr === 3 && nc === 0) {
                return numpadBtns[9] || null; // Borrar
            }
            return null;
        };
        const numpadCoords = (el) => {
            const idx = numpadBtns.indexOf(el);
            if (idx < 0) return null;
            if (idx < 9) return { nr: Math.floor(idx / 3), nc: idx % 3 };
            return { nr: 3, nc: 0 }; // Borrar
        };
        const controlAt = (index) => ([
            document.getElementById('sudoku-new'),
            document.getElementById('sudoku-check'),
            document.getElementById('sudoku-hint'),
            document.getElementById('sudoku-back-to-menu'),
        ][index] || null);

        // Map a board row (0..8) to a numpad row (0..2).
        const boardRowToNumpadRow = (r) => Math.min(2, Math.floor(r / 3));
        // Map the board's 9 columns to the 4 controls above it.
        const boardColToControl = (c) => {
            if (c <= 1) return 0; // Nuevo
            if (c <= 4) return 1; // Verificar
            if (c <= 6) return 2; // Pista
            return 3;             // Menú
        };
        // Map a numpad row (0..3) back to a representative board row.
        const numpadRowToBoardRow = (nr) => {
            if (nr === 0) return 1;
            if (nr === 1) return 4;
            if (nr === 2) return 7;
            return 8; // Borrar — bottom of board
        };

        if (startEl.classList.contains('sudoku-cell')) {
            const r = parseInt(startEl.dataset.row, 10);
            const c = parseInt(startEl.dataset.col, 10);
            switch (direction) {
                case 'ArrowLeft':  return cellAt(r, c - 1);
                case 'ArrowUp':
                    if (r > 0) return cellAt(r - 1, c);
                    return controlAt(boardColToControl(c));
                case 'ArrowDown':  return cellAt(r + 1, c);
                case 'ArrowRight':
                    if (c < 8) return cellAt(r, c + 1);
                    // Cross into numpad at column 0, row matching board row.
                    return numpadAt(boardRowToNumpadRow(r), 0);
            }
            return null;
        }

        const np = numpadCoords(startEl);
        if (np) {
            switch (direction) {
                case 'ArrowRight': return numpadAt(np.nr, np.nc + 1);
                case 'ArrowUp':
                    if (np.nr > 0) return numpadAt(np.nr - 1, np.nc);
                    return controlAt(Math.min(3, np.nc + 1));
                case 'ArrowDown':  return numpadAt(np.nr + 1, np.nc);
                case 'ArrowLeft':
                    if (np.nc > 0) return numpadAt(np.nr, np.nc - 1);
                    // Cross back into board at column 8, row matching numpad row.
                    return cellAt(numpadRowToBoardRow(np.nr), 8);
            }
            return null;
        }

        return null;
    }

    /**
     * Arrow-key navigation while inside the Sudoku game. Uses strict row/col
     * logic (resolveSudokuNavTarget) to move between board cells and numpad
     * buttons, and starts a dwell on the focused element. The element is
     * activated (cell selected, or numpad number placed) only after dwellTime,
     * so users with eye-trackers can preview before committing.
     *
     * Forced-on regardless of the global arrowFocusDwellEnabled setting,
     * since the user has explicitly engaged the sudoku board.
     */
    function isSudokuGridElement(el) {
        return Boolean(el && (
            el.classList.contains('sudoku-cell') ||
            el.classList.contains('numpad-btn')
        ));
    }

    function getSelectedSudokuCellEl() {
        if (!selectedCell) return null;
        const idx = selectedCell.row * 9 + selectedCell.col;
        return sudokuBoardEl.children[idx] || null;
    }

    function sudokuArrowNavigate(direction) {
        // Determine the element to navigate FROM.
        let startEl = null;
        if (navFocusedEl && navFocusedEl.isConnected) {
            startEl = navFocusedEl;
        } else if (selectedCell) {
            startEl = getSelectedSudokuCellEl();
        }
        if (!startEl) {
            startEl = sudokuBoardEl.querySelector('.sudoku-cell');
        }
        if (!startEl) return false;

        buildNavGrid();

        const strictTarget = isSudokuGridElement(startEl)
            ? resolveSudokuNavTarget(startEl, direction)
            : null;
        const target = strictTarget || findDirectionalTarget(startEl, direction);
        if (!target) return false;

        syncNavPositionWithElement(target);
        applySudokuArrowFocus(target);
        return true;
    }

    /**
     * Move arrow-focus highlight + dwell to the given element. Mirrors
     * applyNavFocus() but forces the dwell on (regardless of the global
     * arrowFocusDwellEnabled setting) and avoids clearing the .selected
     * class on previously-selected cells (only .arrow-focused is cleared).
     */
    function applySudokuArrowFocus(el) {
        cancelArrowFocusDwell();
        document.querySelectorAll('.arrow-focused').forEach((node) => {
            node.classList.remove('arrow-focused');
            resetDwellVisual(node);
        });

        if (!el) return;

        el.classList.add('arrow-focused');
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        navFocusedEl = el;

        // Forced dwell: after dwellTime, dispatch a synthetic pointerdown,
        // which fires the element's normal handler (selectSudokuCell for
        // board cells, placeNumber/eraseNumber for numpad buttons).
        focusDwellEl = el;
        startDwellVisual(el);
        focusDwellTimer = setTimeout(() => {
            if (focusDwellEl !== el || navFocusedEl !== el) return;
            cancelArrowFocusDwell();
            el.classList.remove('arrow-focused');
            dispatchSyntheticPointerDown(el);
            playSound();
        }, dwellTime);
    }

    /**
     * Sync the arrow-navigation system (navFocusedEl/navRow/navCol) so it
     * tracks the currently-selected sudoku cell. This bridges the
     * mouse/dwell selection and the arrow-key navigation systems.
     */
    function syncArrowNavToSudokuCell(cell) {
        if (!cell) return;
        // Clear any other arrow-focus highlight without touching .selected
        document.querySelectorAll('.arrow-focused').forEach((el) => {
            if (el !== cell) {
                el.classList.remove('arrow-focused');
                resetDwellVisual(el);
            }
        });
        cancelArrowFocusDwell();
        navFocusedEl = cell;
        // Best-effort sync of nav grid coords (used by Tab navigation)
        buildNavGrid();
        syncNavPositionWithElement(cell);
    }

    function getSolitarioNavTarget(el) {
        if (!el || !el.closest('#solitario-area') || !el.dataset.solKind) return null;
        const target = { kind: el.dataset.solKind };

        if (el.dataset.solCol != null) target.col = parseInt(el.dataset.solCol, 10);
        if (el.dataset.solIndex != null) target.index = parseInt(el.dataset.solIndex, 10);
        if (el.dataset.solSuit) target.suit = el.dataset.solSuit;
        if (el.dataset.solTopIndex != null) target.topIndex = parseInt(el.dataset.solTopIndex, 10);

        return target;
    }

    function isSolitarioTableauNavTarget(target) {
        return Boolean(target && (target.kind === 'tableau' || target.kind === 'empty-tableau'));
    }

    function getSolitarioColumnNavElements(col) {
        return Array.from(solitarioTableauEl.querySelectorAll(`[data-sol-col="${col}"]`))
            .filter((el) => {
                const target = getSolitarioNavTarget(el);
                return isElementVisible(el) && isSolitarioTableauNavTarget(target);
            })
            .sort((a, b) => {
                const ta = getSolitarioNavTarget(a);
                const tb = getSolitarioNavTarget(b);
                return (ta.index ?? -1) - (tb.index ?? -1);
            });
    }

    function findSolitarioColumnElement(col, desiredIndex) {
        if (col < 0 || col > 6) return null;

        const elements = getSolitarioColumnNavElements(col);
        if (elements.length === 0) return null;
        if (desiredIndex == null) return elements[elements.length - 1];

        return elements.reduce((best, candidate) => {
            const bestTarget = getSolitarioNavTarget(best);
            const candidateTarget = getSolitarioNavTarget(candidate);
            const bestDistance = Math.abs((bestTarget.index ?? desiredIndex) - desiredIndex);
            const candidateDistance = Math.abs((candidateTarget.index ?? desiredIndex) - desiredIndex);

            if (candidateDistance < bestDistance) return candidate;
            if (candidateDistance === bestDistance && (candidateTarget.index ?? -1) > (bestTarget.index ?? -1)) {
                return candidate;
            }
            return best;
        }, elements[0]);
    }

    function getSolitarioTopRowElements() {
        return Array.from(solitarioArea.querySelectorAll('[data-sol-row="top"]'))
            .filter(isElementVisible)
            .sort((a, b) => {
                const ta = getSolitarioNavTarget(a);
                const tb = getSolitarioNavTarget(b);
                return (ta.topIndex ?? 0) - (tb.topIndex ?? 0);
            });
    }

    function findSolitarioTableauByHorizontalCenter(sourceEl) {
        if (!sourceEl) return null;
        const sourceRect = sourceEl.getBoundingClientRect();
        const sourceCenter = sourceRect.left + sourceRect.width / 2;
        let best = null;
        let bestDistance = Infinity;

        for (let col = 0; col < 7; col++) {
            const el = findSolitarioColumnElement(col, Number.POSITIVE_INFINITY);
            if (!el) continue;

            const rect = el.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const distance = Math.abs(center - sourceCenter);
            if (distance < bestDistance) {
                best = el;
                bestDistance = distance;
            }
        }

        return best;
    }

    function findSolitarioTopRowByHorizontalCenter(sourceEl) {
        if (!sourceEl) return null;
        const sourceRect = sourceEl.getBoundingClientRect();
        const sourceCenter = sourceRect.left + sourceRect.width / 2;
        let best = null;
        let bestDistance = Infinity;

        getSolitarioTopRowElements().forEach((el) => {
            const rect = el.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const distance = Math.abs(center - sourceCenter);
            if (distance < bestDistance) {
                best = el;
                bestDistance = distance;
            }
        });

        return best;
    }

    /**
     * Solitario has a semantic layout, so directional movement should use the
     * card grid, not generic nearest-element geometry. This keeps left/right
     * inside adjacent tableau columns and up/down inside the same column when
     * possible.
     */
    function resolveSolitarioNavTarget(startEl, direction) {
        const target = getSolitarioNavTarget(startEl);
        if (!target) return null;

        if (isSolitarioTableauNavTarget(target)) {
            const currentIndex = target.index ?? Number.POSITIVE_INFINITY;

            switch (direction) {
                case 'ArrowLeft':
                    return findSolitarioColumnElement(target.col - 1, currentIndex);
                case 'ArrowRight':
                    return findSolitarioColumnElement(target.col + 1, currentIndex);
                case 'ArrowUp': {
                    const previous = getSolitarioColumnNavElements(target.col)
                        .filter((el) => (getSolitarioNavTarget(el).index ?? -1) < currentIndex)
                        .pop();
                    if (previous) return previous;
                    return findSolitarioTopRowByHorizontalCenter(startEl);
                }
                case 'ArrowDown':
                    return getSolitarioColumnNavElements(target.col)
                        .find((el) => (getSolitarioNavTarget(el).index ?? -1) > currentIndex) || null;
            }
            return null;
        }

        if (target.kind === 'stock' || target.kind === 'waste' || target.kind === 'waste-empty' || target.kind === 'foundation') {
            const topElements = getSolitarioTopRowElements();
            const topIndex = topElements.indexOf(startEl);

            switch (direction) {
                case 'ArrowLeft':
                    return topElements[topIndex - 1] || null;
                case 'ArrowRight':
                    return topElements[topIndex + 1] || null;
                case 'ArrowDown':
                    return findSolitarioTableauByHorizontalCenter(startEl);
                case 'ArrowUp':
                    return null;
            }
        }

        return null;
    }

    function solitarioArrowNavigate(direction) {
        let startEl = (navFocusedEl && navFocusedEl.isConnected && navFocusedEl.closest('#solitario-area'))
            ? navFocusedEl
            : null;

        buildNavGrid();

        if (!startEl) {
            startEl = getNavCandidates().find((candidate) => candidate.closest('#solitario-area'));
        }
        if (!startEl) return false;

        const currentTarget = getSolitarioNavTarget(startEl);
        const strictTarget = resolveSolitarioNavTarget(startEl, direction);
        const target = strictTarget || (currentTarget ? null : findDirectionalTarget(startEl, direction));
        if (!target || !target.closest('#solitario-area')) return false;

        syncNavPositionWithElement(target);
        applySolitarioArrowFocus(target);
        return true;
    }

    function applySolitarioArrowFocus(el) {
        cancelArrowFocusDwell();
        document.querySelectorAll('.arrow-focused').forEach((node) => {
            node.classList.remove('arrow-focused');
            resetDwellVisual(node);
        });

        if (!el) return;

        el.classList.add('arrow-focused');
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        navFocusedEl = el;

        focusDwellEl = el;
        startDwellVisual(el);
        focusDwellTimer = setTimeout(() => {
            if (focusDwellEl !== el || navFocusedEl !== el) return;
            cancelArrowFocusDwell();
            el.classList.remove('arrow-focused');
            dispatchSyntheticPointerDown(el);
        }, dwellTime);
    }

    function placeNumber(num) {
        if (!selectedCell) {
            sudokuMessage.textContent = 'Selecciona una celda primero';
            sudokuMessage.className = 'game-message error';
            return;
        }
        const { row, col } = selectedCell;
        if (sudokuGiven[row][col]) return;

        sudokuBoard[row][col] = num;
        const idx = row * 9 + col;
        const cell = sudokuBoardEl.children[idx];
        cell.textContent = num || '';
        cell.classList.remove('error');
        // Mark/unmark as user-entered so it's visually distinct from givens
        if (num) cell.classList.add('user-value');
        else cell.classList.remove('user-value');

        // Re-add dwell fill
        if (!cell.querySelector('.dwell-fill')) {
            const fill = document.createElement('div');
            fill.className = 'dwell-fill';
            cell.appendChild(fill);
        }

        // Check if complete
        if (isBoardFull()) {
            checkSudokuSolution();
        }
    }

    function eraseNumber() {
        if (!selectedCell) {
            sudokuMessage.textContent = 'Selecciona una celda primero';
            sudokuMessage.className = 'game-message error';
            return;
        }
        const { row, col } = selectedCell;
        if (sudokuGiven[row][col]) {
            sudokuMessage.textContent = 'Esta celda es una pista del puzzle y no se puede borrar';
            sudokuMessage.className = 'game-message error';
            return;
        }
        placeNumber(0);
        sudokuMessage.textContent = '';
        sudokuMessage.className = 'game-message';
        const idx = row * 9 + col;
        const cell = sudokuBoardEl.children[idx];
        cell.textContent = '';
        cell.classList.remove('user-value');
        // Re-add dwell fill
        if (!cell.querySelector('.dwell-fill')) {
            const fill = document.createElement('div');
            fill.className = 'dwell-fill';
            cell.appendChild(fill);
        }
    }

    function isBoardFull() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (sudokuBoard[r][c] === 0) return false;
            }
        }
        return true;
    }

    function checkSudokuSolution() {
        let correct = true;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const idx = r * 9 + c;
                const cell = sudokuBoardEl.children[idx];
                if (sudokuBoard[r][c] !== sudokuSolution[r][c]) {
                    correct = false;
                    if (!sudokuGiven[r][c]) {
                        cell.classList.add('error');
                    }
                } else {
                    cell.classList.remove('error');
                }
            }
        }

        if (correct) {
            sudokuMessage.textContent = '🎉 ¡Felicidades! ¡Sudoku completado!';
            sudokuMessage.className = 'game-message success';
        } else {
            sudokuMessage.textContent = '❌ Hay errores. Las celdas incorrectas están marcadas en rojo.';
            sudokuMessage.className = 'game-message error';
        }
    }

    function giveSudokuHint() {
        // Find an empty or incorrect cell and fill it
        const emptyCells = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (!sudokuGiven[r][c] && sudokuBoard[r][c] !== sudokuSolution[r][c]) {
                    emptyCells.push([r, c]);
                }
            }
        }
        if (emptyCells.length === 0) {
            sudokuMessage.textContent = '✅ ¡Todo correcto! No hay más pistas.';
            sudokuMessage.className = 'game-message success';
            return;
        }

        const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        sudokuBoard[r][c] = sudokuSolution[r][c];
        const idx = r * 9 + c;
        const cell = sudokuBoardEl.children[idx];
        cell.textContent = sudokuSolution[r][c];
        cell.classList.remove('error');
        cell.classList.add('user-value');
        cell.classList.add('hint-flash');
        setTimeout(() => cell.classList.remove('hint-flash'), 700);

        // Re-add dwell fill
        if (!cell.querySelector('.dwell-fill')) {
            const fill = document.createElement('div');
            fill.className = 'dwell-fill';
            cell.appendChild(fill);
        }

        sudokuMessage.textContent = '💡 Pista colocada';
        sudokuMessage.className = 'game-message';

        if (isBoardFull()) {
            checkSudokuSolution();
        }
    }

    function buildNumpad() {
        sudokuNumpadEl.innerHTML = '';
        for (let n = 1; n <= 9; n++) {
            const btn = document.createElement('button');
            btn.className = 'numpad-btn';
            btn.textContent = n;
            btn.setAttribute('aria-label', `Número ${n}`);
            const fill = document.createElement('div');
            fill.className = 'dwell-fill';
            btn.appendChild(fill);
            const num = n;
            attachDwell(btn, () => placeNumber(num));
            sudokuNumpadEl.appendChild(btn);
        }
        // Erase button
        const eraseBtn = document.createElement('button');
        eraseBtn.className = 'numpad-btn erase-btn';
        eraseBtn.textContent = '⌫ Borrar';
        eraseBtn.setAttribute('aria-label', 'Borrar número');
        const fill = document.createElement('div');
        fill.className = 'dwell-fill';
        eraseBtn.appendChild(fill);
        attachDwell(eraseBtn, () => eraseNumber());
        sudokuNumpadEl.appendChild(eraseBtn);
    }

    // ========================================================
    // SOLITARIO ENGINE (Klondike, draw one or three)
    // ========================================================
    const SOLITARIO_SUITS = [
        { id: 'hearts', symbol: '♥', name: 'corazones', short: 'H', color: 'red' },
        { id: 'diamonds', symbol: '♦', name: 'diamantes', short: 'D', color: 'red' },
        { id: 'clubs', symbol: '♣', name: 'tréboles', short: 'C', color: 'black' },
        { id: 'spades', symbol: '♠', name: 'picas', short: 'S', color: 'black' },
    ];
    const SOLITARIO_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const SOLITARIO_HISTORY_LIMIT = 80;
    const SOLITARIO_DRAW_COUNTS = [1, 3];

    let solitarioInitialized = false;
    let solitarioStock = [];
    let solitarioWaste = [];
    let solitarioFoundations = {};
    let solitarioTableau = [];
    let solitarioDrawCount = 3;
    let solitarioSelected = null;
    let solitarioMoves = 0;
    let solitarioHistory = [];
    let solitarioHelperText = 'Elige una carta boca arriba y después el lugar donde quieres moverla.';
    let solitarioMessageText = '';
    let solitarioMessageClass = 'game-message';
    let solitarioPostRenderFocusTarget = null;
    let solitarioFitFrame = null;

    const solitarioStockEl = document.getElementById('solitario-stock');
    const solitarioWasteEl = document.getElementById('solitario-waste');
    const solitarioFoundationsEl = document.getElementById('solitario-foundations');
    const solitarioTableauEl = document.getElementById('solitario-tableau');
    const solitarioHelper = document.getElementById('solitario-helper');
    const solitarioMessage = document.getElementById('solitario-message');
    const solitarioMovesEl = document.getElementById('solitario-moves');
    const solitarioStockCountEl = document.getElementById('solitario-stock-count');
    const solitarioDrawModeLabel = document.getElementById('solitario-draw-mode-label');

    function initSolitario() {
        solitarioInitialized = true;
        newSolitarioGame();
    }

    function suitById(id) {
        return SOLITARIO_SUITS.find((suit) => suit.id === id);
    }

    function cardCode(card) {
        if (!card) return '';
        const suit = suitById(card.suit);
        return `${card.rank}${suit ? suit.short : '?'}`;
    }

    function cloneCard(card) {
        return { ...card };
    }

    function createSolitarioCard(rank, suit, value) {
        return {
            id: `${rank}-${suit.id}`,
            suit: suit.id,
            rank,
            value,
            color: suit.color,
            faceUp: false,
        };
    }

    function cardBySpec(rank, suit) {
        const value = SOLITARIO_RANKS.indexOf(rank) + 1;
        return createSolitarioCard(rank, suit, value);
    }

    function faceDown(card) {
        return { ...card, faceUp: false };
    }

    function faceUp(card) {
        return { ...card, faceUp: true };
    }

    function createSolvableSolitarioDeal() {
        const redSuits = shuffle(SOLITARIO_SUITS.filter((suit) => suit.color === 'red'));
        const blackSuits = shuffle(SOLITARIO_SUITS.filter((suit) => suit.color === 'black'));
        const suitOrder = [redSuits[0], redSuits[1], blackSuits[0], blackSuits[1]];
        const [redA, redB, blackA, blackB] = suitOrder;

        const tableau = [
            [faceUp(cardBySpec('A', redA))],
            [faceDown(cardBySpec('A', redB)), faceUp(cardBySpec('K', blackA))],
            [faceDown(cardBySpec('A', blackA)), faceUp(cardBySpec('K', blackB))],
            [faceDown(cardBySpec('A', blackB)), faceUp(cardBySpec('Q', redA))],
            [faceDown(cardBySpec('2', redA)), faceUp(cardBySpec('Q', redB))],
            [faceDown(cardBySpec('2', redB)), faceUp(cardBySpec('J', blackA))],
            [faceDown(cardBySpec('2', blackA)), faceUp(cardBySpec('J', blackB)), faceUp(cardBySpec('2', blackB))],
        ];

        const stockSolution = [];
        SOLITARIO_RANKS.slice(2, 10).forEach((rank) => {
            suitOrder.forEach((suit) => stockSolution.push(cardBySpec(rank, suit)));
        });
        [redA, redB].forEach((suit) => stockSolution.push(cardBySpec('J', suit)));
        [blackA, blackB].forEach((suit) => stockSolution.push(cardBySpec('Q', suit)));
        [redA, redB].forEach((suit) => stockSolution.push(cardBySpec('K', suit)));

        return {
            tableau,
            stock: stockSolution.reverse().map(faceDown),
        };
    }

    function resetSolitarioFoundations() {
        solitarioFoundations = {};
        SOLITARIO_SUITS.forEach((suit) => {
            solitarioFoundations[suit.id] = [];
        });
    }

    function newSolitarioGame() {
        const deal = createSolvableSolitarioDeal();
        solitarioTableau = deal.tableau;
        resetSolitarioFoundations();
        solitarioWaste = [];
        solitarioHistory = [];
        solitarioMoves = 0;
        solitarioSelected = null;
        solitarioPostRenderFocusTarget = null;
        solitarioMessageText = '';
        solitarioMessageClass = 'game-message';
        solitarioHelperText = 'Comodin Larroucau preparó una partida con solución: crea espacios, mueve columnas y luego completa las bases.';

        solitarioStock = deal.stock;
        renderSolitario();
    }

    function snapshotSolitarioState() {
        return {
            stock: solitarioStock.map(cloneCard),
            waste: solitarioWaste.map(cloneCard),
            foundations: Object.fromEntries(
                SOLITARIO_SUITS.map((suit) => [suit.id, solitarioFoundations[suit.id].map(cloneCard)])
            ),
            tableau: solitarioTableau.map((column) => column.map(cloneCard)),
            moves: solitarioMoves,
        };
    }

    function restoreSolitarioState(snapshot) {
        solitarioStock = snapshot.stock.map(cloneCard);
        solitarioWaste = snapshot.waste.map(cloneCard);
        solitarioFoundations = Object.fromEntries(
            SOLITARIO_SUITS.map((suit) => [suit.id, (snapshot.foundations[suit.id] || []).map(cloneCard)])
        );
        solitarioTableau = snapshot.tableau.map((column) => column.map(cloneCard));
        solitarioMoves = snapshot.moves;
        solitarioSelected = null;
        solitarioPostRenderFocusTarget = null;
    }

    function pushSolitarioHistory() {
        solitarioHistory.push(snapshotSolitarioState());
        if (solitarioHistory.length > SOLITARIO_HISTORY_LIMIT) solitarioHistory.shift();
    }

    function undoSolitarioMove() {
        const previous = solitarioHistory.pop();
        if (!previous) {
            setSolitarioMessage('No hay movimientos para deshacer.', true);
            renderSolitario();
            return;
        }

        restoreSolitarioState(previous);
        setSolitarioHelper('Comodin Larroucau devolvió la jugada anterior.');
        setSolitarioMessage('Movimiento deshecho.', false);
        renderSolitario();
    }

    function setSolitarioHelper(text) {
        solitarioHelperText = text;
    }

    function setSolitarioMessage(text, isError) {
        solitarioMessageText = text;
        solitarioMessageClass = `game-message${isError ? ' error' : (text ? ' success' : '')}`;
    }

    function getSolitarioSelectedCards() {
        if (!solitarioSelected) return [];

        if (solitarioSelected.source === 'waste') {
            const card = solitarioWaste[solitarioWaste.length - 1];
            return card ? [card] : [];
        }

        if (solitarioSelected.source === 'foundation') {
            const pile = solitarioFoundations[solitarioSelected.suit] || [];
            const card = pile[pile.length - 1];
            return card ? [card] : [];
        }

        if (solitarioSelected.source === 'tableau') {
            const column = solitarioTableau[solitarioSelected.col] || [];
            return column.slice(solitarioSelected.index);
        }

        return [];
    }

    function isTopWasteTarget(target) {
        return target.kind === 'waste' && solitarioWaste.length > 0;
    }

    function getSolitarioWasteVisibleCards() {
        return solitarioWaste.slice(-solitarioDrawCount);
    }

    function isTopFoundationTarget(target) {
        const pile = solitarioFoundations[target.suit] || [];
        return target.kind === 'foundation' && pile.length > 0;
    }

    function isSelectableSolitarioSource(target) {
        if (target.kind === 'tableau') {
            const card = solitarioTableau[target.col]?.[target.index];
            return Boolean(card && card.faceUp);
        }
        return isTopWasteTarget(target) || isTopFoundationTarget(target);
    }

    function toggleSolitarioDrawMode() {
        const currentIndex = SOLITARIO_DRAW_COUNTS.indexOf(solitarioDrawCount);
        solitarioDrawCount = SOLITARIO_DRAW_COUNTS[(currentIndex + 1) % SOLITARIO_DRAW_COUNTS.length];
        solitarioSelected = null;
        solitarioPostRenderFocusTarget = { kind: 'stock' };
        setSolitarioMessage(`Modo de robo cambiado a ${solitarioDrawCount} carta${solitarioDrawCount === 1 ? '' : 's'}.`, false);
        setSolitarioHelper(solitarioDrawCount === 1
            ? 'Robo 1: más claro y fácil para jugar con reposo.'
            : 'Robo 3: modo clásico; solo la carta de adelante del descarte se puede mover.');
        renderSolitario();
    }

    function selectSolitarioSource(target) {
        if (target.kind === 'tableau') {
            const card = solitarioTableau[target.col][target.index];
            solitarioSelected = { source: 'tableau', col: target.col, index: target.index };
            const count = solitarioTableau[target.col].length - target.index;
            setSolitarioHelper(count > 1
                ? `Comodin Larroucau seleccionó ${card.rank}${suitById(card.suit).symbol} y ${count - 1} carta(s) debajo.`
                : `Comodin Larroucau seleccionó ${card.rank}${suitById(card.suit).symbol}. Elige una columna o una base.`);
            setSolitarioMessage('', false);
            renderSolitario();
            return;
        }

        if (target.kind === 'waste') {
            const card = solitarioWaste[solitarioWaste.length - 1];
            solitarioSelected = { source: 'waste' };
            setSolitarioHelper(`Comodin Larroucau seleccionó ${card.rank}${suitById(card.suit).symbol} desde el descarte.`);
            setSolitarioMessage('', false);
            renderSolitario();
            return;
        }

        if (target.kind === 'foundation') {
            const pile = solitarioFoundations[target.suit];
            const card = pile[pile.length - 1];
            solitarioSelected = { source: 'foundation', suit: target.suit };
            setSolitarioHelper(`Comodin Larroucau seleccionó ${card.rank}${suitById(card.suit).symbol} desde una base.`);
            setSolitarioMessage('', false);
            renderSolitario();
        }
    }

    function isSameSolitarioSelection(target) {
        if (!solitarioSelected) return false;

        if (solitarioSelected.source === 'waste') return target.kind === 'waste';
        if (solitarioSelected.source === 'foundation') {
            return target.kind === 'foundation' && target.suit === solitarioSelected.suit;
        }
        if (solitarioSelected.source === 'tableau') {
            return target.kind === 'tableau' &&
                target.col === solitarioSelected.col &&
                target.index >= solitarioSelected.index;
        }
        return false;
    }

    function clearSolitarioSelection(message) {
        solitarioSelected = null;
        if (message) setSolitarioHelper(message);
        renderSolitario();
    }

    function canCardMoveToFoundation(card, suitId) {
        if (!card) return false;
        const targetSuit = suitId || card.suit;
        if (targetSuit !== card.suit) return false;
        const pile = solitarioFoundations[targetSuit] || [];
        if (pile.length === 0) return card.value === 1;
        return pile[pile.length - 1].value + 1 === card.value;
    }

    function canCardsMoveToTableau(cards, targetCol) {
        if (!cards.length) return false;
        const first = cards[0];
        const column = solitarioTableau[targetCol] || [];
        if (column.length === 0) return first.value === 13;
        const top = column[column.length - 1];
        return top.faceUp && top.color !== first.color && top.value === first.value + 1;
    }

    function removeSolitarioSelectedCards() {
        const cards = getSolitarioSelectedCards().map(cloneCard);

        if (solitarioSelected.source === 'waste') {
            solitarioWaste.pop();
        } else if (solitarioSelected.source === 'foundation') {
            solitarioFoundations[solitarioSelected.suit].pop();
        } else if (solitarioSelected.source === 'tableau') {
            const column = solitarioTableau[solitarioSelected.col];
            column.splice(solitarioSelected.index);
            const newTop = column[column.length - 1];
            if (newTop && !newTop.faceUp) newTop.faceUp = true;
        }

        cards.forEach((card) => { card.faceUp = true; });
        return cards;
    }

    function moveSelectedToFoundation(suitId) {
        const cards = getSolitarioSelectedCards();
        if (cards.length !== 1) {
            setSolitarioMessage('Solo se puede subir una carta a la base.', true);
            setSolitarioHelper('Comodin Larroucau recuerda: las bases se completan de As a Rey, una carta a la vez.');
            renderSolitario();
            return false;
        }

        const card = cards[0];
        if (!canCardMoveToFoundation(card, suitId)) {
            setSolitarioMessage('Esa carta no puede ir a esa base todavía.', true);
            setSolitarioHelper('Busca el As primero, luego 2, 3, 4 y así hasta el Rey de la misma pinta.');
            renderSolitario();
            return false;
        }

        pushSolitarioHistory();
        const moved = removeSolitarioSelectedCards()[0];
        solitarioFoundations[moved.suit].push(moved);
        solitarioPostRenderFocusTarget = { kind: 'foundation', suit: moved.suit };
        solitarioSelected = null;
        solitarioMoves++;
        setSolitarioMessage('Carta subida a la base.', false);
        setSolitarioHelper(`Bien: ${moved.rank}${suitById(moved.suit).symbol} quedó en su base.`);
        checkSolitarioWin();
        renderSolitario();
        return true;
    }

    function moveSelectedToTableau(targetCol) {
        const cards = getSolitarioSelectedCards();
        if (solitarioSelected?.source === 'tableau' && solitarioSelected.col === targetCol) {
            setSolitarioMessage('La carta ya está en esa columna.', true);
            renderSolitario();
            return false;
        }

        if (!canCardsMoveToTableau(cards, targetCol)) {
            const first = cards[0];
            const column = solitarioTableau[targetCol] || [];
            const hint = column.length === 0
                ? 'Solo un Rey puede partir una columna vacía.'
                : 'En las columnas se baja alternando color: rojo sobre negro o negro sobre rojo.';
            setSolitarioMessage(first ? 'Ese movimiento no está permitido.' : 'Selecciona una carta primero.', true);
            setSolitarioHelper(hint);
            renderSolitario();
            return false;
        }

        pushSolitarioHistory();
        const destinationIndex = solitarioTableau[targetCol].length;
        const moved = removeSolitarioSelectedCards();
        solitarioTableau[targetCol].push(...moved);
        solitarioPostRenderFocusTarget = { kind: 'tableau', col: targetCol, index: destinationIndex };
        solitarioSelected = null;
        solitarioMoves++;
        setSolitarioMessage('Movimiento realizado.', false);
        setSolitarioHelper(`Comodin Larroucau movió ${moved.length === 1 ? cardCode(moved[0]) : `${moved.length} cartas`} a la columna ${targetCol + 1}.`);
        renderSolitario();
        return true;
    }

    function drawSolitarioStock() {
        solitarioSelected = null;

        if (solitarioStock.length > 0) {
            pushSolitarioHistory();
            const drawn = [];
            const drawTotal = Math.min(solitarioDrawCount, solitarioStock.length);
            for (let i = 0; i < drawTotal; i++) {
                const card = solitarioStock.pop();
                card.faceUp = true;
                solitarioWaste.push(card);
                drawn.push(card);
            }
            solitarioPostRenderFocusTarget = { kind: 'waste' };
            solitarioMoves++;
            setSolitarioMessage(drawn.length === 1 ? 'Carta robada.' : `${drawn.length} cartas robadas.`, false);
            const card = drawn[drawn.length - 1];
            setSolitarioHelper(solitarioDrawCount === 1
                ? `Comodin Larroucau mostró ${card.rank}${suitById(card.suit).symbol}. Puedes moverla si calza.`
                : `Comodin Larroucau mostró ${drawn.length} carta(s). En Robo 3 se juega la carta de adelante: ${card.rank}${suitById(card.suit).symbol}.`);
            renderSolitario();
            return;
        }

        if (solitarioWaste.length > 0) {
            pushSolitarioHistory();
            solitarioStock = solitarioWaste.slice().reverse().map((card) => ({ ...card, faceUp: false }));
            solitarioWaste = [];
            solitarioPostRenderFocusTarget = { kind: 'stock' };
            solitarioMoves++;
            setSolitarioMessage('Descarte devuelto al robo.', false);
            setSolitarioHelper('Comodin Larroucau dio vuelta el descarte para seguir robando.');
            renderSolitario();
            return;
        }

        setSolitarioMessage('No quedan cartas por robar.', true);
        setSolitarioHelper('Comodin Larroucau no ve más cartas en el robo ni en el descarte.');
        renderSolitario();
    }

    function handleSolitarioActivation(target) {
        if (target.kind === 'stock') {
            drawSolitarioStock();
            return;
        }

        if (solitarioSelected) {
            if (isSameSolitarioSelection(target)) {
                clearSolitarioSelection('Selección cancelada. Comodin Larroucau espera otra carta.');
                return;
            }

            if (target.kind === 'foundation' && moveSelectedToFoundation(target.suit)) return;
            if ((target.kind === 'tableau' || target.kind === 'empty-tableau') && moveSelectedToTableau(target.col)) return;
        }

        if (isSelectableSolitarioSource(target)) {
            selectSolitarioSource(target);
            return;
        }

        if (target.kind === 'waste-empty') {
            setSolitarioMessage('El descarte está vacío.', true);
            setSolitarioHelper('Usa Robar para mostrar una carta.');
        } else if (target.kind === 'empty-tableau') {
            setSolitarioMessage('Selecciona un Rey para usar una columna vacía.', true);
            setSolitarioHelper('Las columnas vacías empiezan con Rey.');
        } else {
            setSolitarioMessage('Selecciona una carta boca arriba.', true);
            setSolitarioHelper('Comodin Larroucau solo puede mover cartas visibles.');
        }
        renderSolitario();
    }

    function checkSolitarioWin() {
        const won = SOLITARIO_SUITS.every((suit) => solitarioFoundations[suit.id].length === 13);
        if (!won) return false;
        setSolitarioMessage('🎉 ¡Solitario completado!', false);
        setSolitarioHelper('Comodin Larroucau celebra contigo: todas las pintas quedaron ordenadas.');
        return true;
    }

    function findSolitarioHint() {
        const wasteTop = solitarioWaste[solitarioWaste.length - 1];
        if (wasteTop && canCardMoveToFoundation(wasteTop)) {
            return `Sube ${wasteTop.rank}${suitById(wasteTop.suit).symbol} del descarte a su base.`;
        }

        for (let col = 0; col < 7; col++) {
            const top = solitarioTableau[col][solitarioTableau[col].length - 1];
            if (top && top.faceUp && canCardMoveToFoundation(top)) {
                return `Sube ${top.rank}${suitById(top.suit).symbol} desde la columna ${col + 1} a su base.`;
            }
        }

        if (wasteTop) {
            for (let targetCol = 0; targetCol < 7; targetCol++) {
                if (canCardsMoveToTableau([wasteTop], targetCol)) {
                    return `Mueve ${wasteTop.rank}${suitById(wasteTop.suit).symbol} del descarte a la columna ${targetCol + 1}.`;
                }
            }
        }

        for (let sourceCol = 0; sourceCol < 7; sourceCol++) {
            const column = solitarioTableau[sourceCol];
            for (let index = 0; index < column.length; index++) {
                const card = column[index];
                if (!card.faceUp) continue;
                const moving = column.slice(index);
                for (let targetCol = 0; targetCol < 7; targetCol++) {
                    if (targetCol === sourceCol) continue;
                    if (canCardsMoveToTableau(moving, targetCol)) {
                        return `Mueve ${card.rank}${suitById(card.suit).symbol} y sus cartas desde la columna ${sourceCol + 1} a la columna ${targetCol + 1}.`;
                    }
                }
            }
        }

        if (solitarioStock.length > 0) return 'Roba una carta nueva.';
        if (solitarioWaste.length > 0) return 'Devuelve el descarte al robo para seguir buscando jugadas.';
        return 'No veo una jugada clara. Puedes deshacer o empezar una partida nueva.';
    }

    function giveSolitarioHint() {
        const hint = findSolitarioHint();
        setSolitarioMessage('Comodin Larroucau tiene una pista.', false);
        setSolitarioHelper(`Comodin Larroucau dice: ${hint}`);
        renderSolitario();
    }

    function applySolitarioNavData(el, target) {
        if (!el || !target) return;

        el.dataset.solKind = target.kind;
        if (target.col != null) el.dataset.solCol = String(target.col);
        if (target.index != null) el.dataset.solIndex = String(target.index);
        if (target.suit) el.dataset.solSuit = target.suit;
    }

    function createDwellFill() {
        const fill = document.createElement('div');
        fill.className = 'dwell-fill';
        return fill;
    }

    function createCardButton(card, target, extraClass) {
        const suit = suitById(card.suit);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `sol-card ${card.color} ${extraClass || ''}`.trim();
        btn.setAttribute('aria-label', `${card.rank} de ${suit.name}`);
        btn.dataset.cardId = card.id;
        applySolitarioNavData(btn, target);
        btn.innerHTML = `
            <span class="sol-card-inner">
                <span class="sol-card-corner"><span>${card.rank}</span><span>${suit.symbol}</span></span>
                <span class="sol-card-center">${suit.symbol}</span>
                <span class="sol-card-corner bottom"><span>${card.rank}</span><span>${suit.symbol}</span></span>
            </span>
        `;
        btn.appendChild(createDwellFill());
        attachDwell(btn, () => handleSolitarioActivation(target));
        return btn;
    }

    function createEmptySlotButton(label, target, text) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sol-empty-slot';
        btn.setAttribute('aria-label', label);
        applySolitarioNavData(btn, target);
        btn.innerHTML = `<span class="sol-placeholder-text">${text}</span>`;
        btn.appendChild(createDwellFill());
        attachDwell(btn, () => handleSolitarioActivation(target));
        return btn;
    }

    function renderSolitarioStock() {
        solitarioStockEl.innerHTML = '';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `sol-stock-button ${solitarioStock.length ? 'has-stock' : 'empty'}`;
        btn.setAttribute('aria-label', solitarioStock.length
            ? `Robar carta. Quedan ${solitarioStock.length}`
            : (solitarioWaste.length ? 'Volver a poner el descarte en el robo' : 'Robo vacío'));
        applySolitarioNavData(btn, { kind: 'stock' });
        btn.dataset.solRow = 'top';
        btn.dataset.solTopIndex = '0';

        if (solitarioStock.length) {
            btn.innerHTML = `<span>★</span><span class="sol-stock-count">${solitarioStock.length}</span>`;
        } else if (solitarioWaste.length) {
            btn.innerHTML = '<span class="sol-placeholder-text">↻</span>';
        } else {
            btn.innerHTML = '<span class="sol-placeholder-text">Vacío</span>';
        }

        btn.appendChild(createDwellFill());
        attachDwell(btn, () => handleSolitarioActivation({ kind: 'stock' }));
        solitarioStockEl.appendChild(btn);
    }

    function renderSolitarioWaste() {
        solitarioWasteEl.innerHTML = '';
        const top = solitarioWaste[solitarioWaste.length - 1];
        if (top) {
            const visibleWaste = getSolitarioWasteVisibleCards();
            const wasteStack = document.createElement('div');
            wasteStack.className = 'sol-waste-stack';
            visibleWaste.forEach((card, index) => {
                const isTop = index === visibleWaste.length - 1;
                const btn = createCardButton(
                    card,
                    { kind: isTop ? 'waste' : 'waste-preview' },
                    `sol-waste-card waste-offset-${index}`
                );
                btn.style.zIndex = index + 1;
                btn.style.left = `${index * 24}px`;

                if (isTop) {
                    btn.dataset.solRow = 'top';
                    btn.dataset.solTopIndex = '1';
                    if (solitarioSelected?.source === 'waste') {
                        btn.classList.add('selected');
                    }
                } else {
                    btn.classList.add('waste-preview');
                    btn.setAttribute('aria-label', `${btn.getAttribute('aria-label')} (no disponible todavía)`);
                    btn.disabled = true;
                }
                wasteStack.appendChild(btn);
            });
            solitarioWasteEl.appendChild(wasteStack);
            return;
        }

        const emptyWaste = createEmptySlotButton(
            'Descarte vacío',
            { kind: 'waste-empty' },
            'Vacío'
        );
        emptyWaste.dataset.solRow = 'top';
        emptyWaste.dataset.solTopIndex = '1';
        solitarioWasteEl.appendChild(emptyWaste);
    }

    function renderSolitarioFoundations() {
        solitarioFoundationsEl.innerHTML = '';
        SOLITARIO_SUITS.forEach((suit) => {
            const group = document.createElement('div');
            group.className = 'solitario-pile-group sol-foundation-slot';

            const label = document.createElement('span');
            label.className = 'solitario-pile-label';
            label.textContent = suit.name;
            group.appendChild(label);

            const pile = document.createElement('div');
            pile.className = 'solitario-pile';
            const cards = solitarioFoundations[suit.id];
            const top = cards[cards.length - 1];
            const topIndex = String(SOLITARIO_SUITS.indexOf(suit) + 2);

            if (top) {
                const btn = createCardButton(top, { kind: 'foundation', suit: suit.id }, 'sol-foundation-card');
                btn.dataset.solRow = 'top';
                btn.dataset.solTopIndex = topIndex;
                if (solitarioSelected?.source === 'foundation' && solitarioSelected.suit === suit.id) {
                    btn.classList.add('selected');
                }
                pile.appendChild(btn);
            } else {
                const foundationSlot = createEmptySlotButton(
                    `Base de ${suit.name}`,
                    { kind: 'foundation', suit: suit.id },
                    suit.symbol
                );
                foundationSlot.dataset.solRow = 'top';
                foundationSlot.dataset.solTopIndex = topIndex;
                pile.appendChild(foundationSlot);
            }

            group.appendChild(pile);
            solitarioFoundationsEl.appendChild(group);
        });
    }

    function renderSolitarioTableau() {
        solitarioTableauEl.innerHTML = '';
        solitarioTableau.forEach((column, col) => {
            const columnEl = document.createElement('div');
            columnEl.className = 'solitario-column';
            columnEl.dataset.cardCount = String(Math.max(1, column.length));
            columnEl.setAttribute('aria-label', `Columna ${col + 1}`);

            if (column.length === 0) {
                columnEl.appendChild(createEmptySlotButton(
                    `Columna ${col + 1} vacía`,
                    { kind: 'empty-tableau', col, index: 0 },
                    'Rey'
                ));
            } else {
                column.forEach((card, index) => {
                    if (!card.faceUp) {
                        const back = document.createElement('div');
                        back.className = 'sol-card face-down sol-tableau-card';
                        back.textContent = '★';
                        back.style.zIndex = index + 1;
                        columnEl.appendChild(back);
                        return;
                    }

                    const isCovered = index < column.length - 1;
                    const btn = createCardButton(
                        card,
                        { kind: 'tableau', col, index },
                        `sol-tableau-card sol-tableau-card-face-up${isCovered ? ' sol-tableau-card-covered' : ''}`
                    );
                    btn.style.zIndex = index + 1;
                    btn.style.setProperty('--sol-tableau-layer', String(index + 1));
                    if (solitarioSelected?.source === 'tableau' && solitarioSelected.col === col) {
                        if (index === solitarioSelected.index) btn.classList.add('selected');
                        if (index > solitarioSelected.index) btn.classList.add('sequence-selected');
                    }
                    columnEl.appendChild(btn);
                });
            }

            solitarioTableauEl.appendChild(columnEl);
        });
    }

    function getPixelValue(value) {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function fitSolitarioTableauToViewport() {
        if (!document.body.classList.contains('solitario-game-active')) return;
        if (!solitarioTableauEl || solitarioTableauEl.style.display === 'none') return;

        const sampleCard = solitarioTableauEl.querySelector('.sol-tableau-card, .sol-empty-slot');
        if (!sampleCard) return;

        const tableauRect = solitarioTableauEl.getBoundingClientRect();
        const tableauStyle = getComputedStyle(solitarioTableauEl);
        const paddingY = getPixelValue(tableauStyle.paddingTop) + getPixelValue(tableauStyle.paddingBottom);
        const cardHeight = sampleCard.getBoundingClientRect().height;
        const messageHeight = solitarioMessage ? solitarioMessage.getBoundingClientRect().height : 0;
        const availableHeight = window.innerHeight - tableauRect.top - messageHeight - 10;
        const availableColumnHeight = Math.max(cardHeight, availableHeight - paddingY);
        const preferredStep = Math.min(48, Math.max(30, cardHeight * 0.34));
        const readableStep = Math.min(28, Math.max(16, cardHeight * 0.16));

        solitarioTableauEl.querySelectorAll('.solitario-column').forEach((columnEl) => {
            const cardCount = parseInt(columnEl.dataset.cardCount || '1', 10);
            let step = preferredStep;

            if (cardCount > 1) {
                const fitStep = (availableColumnHeight - cardHeight) / (cardCount - 1);
                step = Math.min(preferredStep, Math.max(readableStep, fitStep));
                if (fitStep < readableStep) step = Math.max(8, fitStep);
            }

            columnEl.style.setProperty('--sol-tableau-column-step', `${Math.max(8, Math.floor(step))}px`);
        });
    }

    function scheduleSolitarioTableauFit() {
        if (solitarioFitFrame) cancelAnimationFrame(solitarioFitFrame);
        solitarioFitFrame = requestAnimationFrame(() => {
            solitarioFitFrame = null;
            fitSolitarioTableauToViewport();
        });
    }

    function getRenderedSolitarioSelectionEl() {
        if (!solitarioSelected) return null;

        if (solitarioSelected.source === 'waste') {
            return solitarioWasteEl.querySelector('[data-sol-kind="waste"]');
        }

        if (solitarioSelected.source === 'foundation') {
            return solitarioFoundationsEl.querySelector(
                `[data-sol-kind="foundation"][data-sol-suit="${solitarioSelected.suit}"]`
            );
        }

        if (solitarioSelected.source === 'tableau') {
            return solitarioTableauEl.querySelector(
                `[data-sol-kind="tableau"][data-sol-col="${solitarioSelected.col}"][data-sol-index="${solitarioSelected.index}"]`
            );
        }

        return null;
    }

    function getRenderedSolitarioFocusEl(target) {
        if (!target) return null;

        if (target.kind === 'stock') {
            return solitarioStockEl.querySelector('[data-sol-kind="stock"]');
        }

        if (target.kind === 'waste') {
            return solitarioWasteEl.querySelector('[data-sol-kind="waste"]') ||
                solitarioWasteEl.querySelector('[data-sol-kind="waste-empty"]');
        }

        if (target.kind === 'foundation') {
            return solitarioFoundationsEl.querySelector(
                `[data-sol-kind="foundation"][data-sol-suit="${target.suit}"]`
            );
        }

        if (target.kind === 'tableau' || target.kind === 'empty-tableau') {
            return solitarioTableauEl.querySelector(
                `[data-sol-col="${target.col}"][data-sol-index="${target.index}"]`
            ) || findSolitarioColumnElement(target.col, target.index);
        }

        return null;
    }

    function syncArrowNavToSolitarioElement(focusEl, shouldStartDwell) {
        if (!focusEl) return;

        cancelArrowFocusDwell();
        document.querySelectorAll('.arrow-focused').forEach((el) => {
            if (el !== focusEl) {
                el.classList.remove('arrow-focused');
                resetDwellVisual(el);
            }
        });

        focusEl.classList.add('arrow-focused');
        focusEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        navFocusedEl = focusEl;
        buildNavGrid();
        syncNavPositionWithElement(focusEl);

        if (shouldStartDwell) startArrowFocusDwell(focusEl);
    }

    function syncArrowNavToSolitarioSelection() {
        syncArrowNavToSolitarioElement(getRenderedSolitarioSelectionEl(), false);
    }

    function syncArrowNavToSolitarioPostMove() {
        if (!solitarioPostRenderFocusTarget) return;

        const focusEl = getRenderedSolitarioFocusEl(solitarioPostRenderFocusTarget);
        solitarioPostRenderFocusTarget = null;
        syncArrowNavToSolitarioElement(focusEl, false);
    }

    function renderSolitario() {
        renderSolitarioStock();
        renderSolitarioWaste();
        renderSolitarioFoundations();
        renderSolitarioTableau();

        solitarioHelper.textContent = solitarioHelperText;
        solitarioMessage.textContent = solitarioMessageText;
        solitarioMessage.className = solitarioMessageClass;
        solitarioMovesEl.textContent = String(solitarioMoves);
        solitarioStockCountEl.textContent = String(solitarioStock.length);
        solitarioDrawModeLabel.textContent = `Robo ${solitarioDrawCount}`;
        if (solitarioSelected) {
            syncArrowNavToSolitarioSelection();
        } else {
            syncArrowNavToSolitarioPostMove();
        }
        scheduleSolitarioTableauFit();
        renderGameToText();
    }

    // ========================================================
    // Arrow navigation
    // ========================================================
    const VISUAL_ROW_TOLERANCE = 12;
    const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    let navGrid = [];
    let navRow = 0;
    let navCol = 0;
    let navFocusedEl = null;
    let focusDwellTimer = null;
    let focusDwellEl = null;
    const pressedArrowKeys = new Set();

    function isElementVisible(el) {
        return Boolean(el && el.isConnected && el.getClientRects().length > 0 && !el.disabled);
    }

    function groupElementsByVisualRows(elements, section) {
        const positioned = elements
            .filter(isElementVisible)
            .map((el) => ({ el, rect: el.getBoundingClientRect() }))
            .sort((a, b) => {
                if (Math.abs(a.rect.top - b.rect.top) > VISUAL_ROW_TOLERANCE) {
                    return a.rect.top - b.rect.top;
                }
                return a.rect.left - b.rect.left;
            });

        const rows = [];

        positioned.forEach(({ el, rect }) => {
            let row = rows.find((candidate) => Math.abs(candidate.top - rect.top) <= VISUAL_ROW_TOLERANCE);
            if (!row) {
                row = { top: rect.top, elements: [] };
                rows.push(row);
            }

            row.top = ((row.top * row.elements.length) + rect.top) / (row.elements.length + 1);
            row.elements.push({ el, left: rect.left });
        });

        return rows
            .sort((a, b) => a.top - b.top)
            .map((row) => ({
                section,
                elements: row.elements.sort((a, b) => a.left - b.left).map((item) => item.el),
            }))
            .filter((row) => row.elements.length > 0);
    }

    function buildNavGrid() {
        navGrid = [];

        navGrid.push(...groupElementsByVisualRows(
            Array.from(document.querySelectorAll('.games-top-bar button')),
            'top-bar'
        ));
        navGrid.push(...groupElementsByVisualRows(
            Array.from(document.querySelectorAll('#game-selector button')),
            'selector'
        ));
        navGrid.push(...groupElementsByVisualRows(
            Array.from(document.querySelectorAll('.game-controls .game-btn')),
            'controls'
        ));
        navGrid.push(...groupElementsByVisualRows(
            Array.from(document.querySelectorAll('.game-area button')).filter((el) => (
                !el.closest('.game-controls') && !el.closest('.sudoku-numpad')
            )),
            'game-buttons'
        ));
        navGrid.push(...groupElementsByVisualRows(
            Array.from(document.querySelectorAll('.sudoku-board .sudoku-cell')),
            'board'
        ));
        navGrid.push(...groupElementsByVisualRows(
            Array.from(document.querySelectorAll('.sudoku-numpad .numpad-btn')),
            'numpad'
        ));
    }

    function isArrowFocusDwellActive() {
        return arrowNavEnabled && arrowFocusDwellEnabled && dwellEnabled;
    }

    function cancelArrowFocusDwell() {
        if (focusDwellTimer) {
            clearTimeout(focusDwellTimer);
            focusDwellTimer = null;
        }

        if (focusDwellEl) {
            resetDwellVisual(focusDwellEl);
            focusDwellEl = null;
        }
    }

    function dispatchSyntheticPointerDown(el) {
        if (!el) return;

        const downEvent = typeof PointerEvent === 'function'
            ? new PointerEvent('pointerdown', { bubbles: true })
            : new MouseEvent('mousedown', { bubbles: true });

        el.dispatchEvent(downEvent);
    }

    function startArrowFocusDwell(el) {
        cancelArrowFocusDwell();

        if (!el || !isArrowFocusDwellActive()) return;

        focusDwellEl = el;
        startDwellVisual(el);

        focusDwellTimer = setTimeout(() => {
            if (focusDwellEl !== el || navFocusedEl !== el) return;
            cancelArrowFocusDwell();
            dispatchSyntheticPointerDown(el);
        }, dwellTime);
    }

    function clearArrowNavFocus() {
        cancelArrowFocusDwell();

        if (navFocusedEl) {
            navFocusedEl.classList.remove('arrow-focused');
            navFocusedEl = null;
        }

        document.querySelectorAll('.arrow-focused').forEach((el) => el.classList.remove('arrow-focused'));
    }

    function applyNavFocus() {
        clearArrowNavFocus();

        if (navGrid.length === 0) return;

        navRow = Math.max(0, Math.min(navRow, navGrid.length - 1));
        const row = navGrid[navRow].elements;
        navCol = Math.max(0, Math.min(navCol, row.length - 1));

        const el = row[navCol];
        if (el) {
            el.classList.add('arrow-focused');
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            navFocusedEl = el;
            startArrowFocusDwell(el);
        }
    }

    function focusFirstNavigableElement() {
        buildNavGrid();
        if (navGrid.length === 0) return false;
        navRow = 0;
        navCol = 0;
        applyNavFocus();
        return true;
    }

    function syncNavPositionWithFocusedElement() {
        if (!navFocusedEl || !navFocusedEl.isConnected) return false;

        for (let rowIndex = 0; rowIndex < navGrid.length; rowIndex++) {
            const colIndex = navGrid[rowIndex].elements.indexOf(navFocusedEl);
            if (colIndex !== -1) {
                navRow = rowIndex;
                navCol = colIndex;
                return true;
            }
        }

        navRow = 0;
        navCol = 0;
        return false;
    }

    function syncNavPositionWithElement(targetEl) {
        if (!targetEl || !targetEl.isConnected) return false;

        for (let rowIndex = 0; rowIndex < navGrid.length; rowIndex++) {
            const colIndex = navGrid[rowIndex].elements.indexOf(targetEl);
            if (colIndex !== -1) {
                navRow = rowIndex;
                navCol = colIndex;
                return true;
            }
        }

        return false;
    }

    function getNavCandidates() {
        const seen = new Set();
        const candidates = [];

        navGrid.forEach((row) => {
            row.elements.forEach((el) => {
                if (!seen.has(el)) {
                    seen.add(el);
                    candidates.push(el);
                }
            });
        });

        return candidates;
    }

    function getElementCenter(rect) {
        return {
            x: rect.left + (rect.width / 2),
            y: rect.top + (rect.height / 2),
        };
    }

    function rangesOverlap(startA, endA, startB, endB) {
        return startA <= endB && startB <= endA;
    }

    function findDirectionalTarget(currentEl, direction) {
        if (!currentEl) return null;

        const currentRect = currentEl.getBoundingClientRect();
        const currentCenter = getElementCenter(currentRect);
        let bestCandidate = null;
        let bestScore = Infinity;

        getNavCandidates().forEach((candidate) => {
            if (candidate === currentEl || !isElementVisible(candidate)) return;

            const rect = candidate.getBoundingClientRect();
            const center = getElementCenter(rect);
            let primaryDistance = 0;
            let secondaryDistance = 0;
            let overlapsAxis = false;

            switch (direction) {
                case 'ArrowRight':
                    primaryDistance = center.x - currentCenter.x;
                    if (primaryDistance <= 0) return;
                    secondaryDistance = Math.abs(center.y - currentCenter.y);
                    overlapsAxis = rangesOverlap(currentRect.top, currentRect.bottom, rect.top, rect.bottom);
                    break;

                case 'ArrowLeft':
                    primaryDistance = currentCenter.x - center.x;
                    if (primaryDistance <= 0) return;
                    secondaryDistance = Math.abs(center.y - currentCenter.y);
                    overlapsAxis = rangesOverlap(currentRect.top, currentRect.bottom, rect.top, rect.bottom);
                    break;

                case 'ArrowDown':
                    primaryDistance = center.y - currentCenter.y;
                    if (primaryDistance <= 0) return;
                    secondaryDistance = Math.abs(center.x - currentCenter.x);
                    overlapsAxis = rangesOverlap(currentRect.left, currentRect.right, rect.left, rect.right);
                    break;

                case 'ArrowUp':
                    primaryDistance = currentCenter.y - center.y;
                    if (primaryDistance <= 0) return;
                    secondaryDistance = Math.abs(center.x - currentCenter.x);
                    overlapsAxis = rangesOverlap(currentRect.left, currentRect.right, rect.left, rect.right);
                    break;

                default:
                    return;
            }

            const score = primaryDistance + secondaryDistance * (overlapsAxis ? 0.25 : 2);
            if (score < bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        });

        return bestCandidate;
    }

    function setupArrowNavigation() {
        document.addEventListener('keydown', (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

            const sudokuVisible = sudokuArea && sudokuArea.style.display !== 'none';
            const solitarioVisible = solitarioArea && solitarioArea.style.display !== 'none';

            // Sudoku-specific arrow handling: when the sudoku game is visible,
            // arrow keys navigate (with dwell) across board cells and the
            // numpad, regardless of the global arrowNavEnabled setting.
            if (sudokuVisible && ARROW_KEYS.has(e.key)) {
                e.preventDefault();
                sudokuArrowNavigate(e.key);
                return;
            }

            if (solitarioVisible && ARROW_KEYS.has(e.key)) {
                e.preventDefault();
                solitarioArrowNavigate(e.key);
                return;
            }

            if (solitarioVisible && (e.key === 'Enter' || e.key === ' ')) {
                if (navFocusedEl && navFocusedEl.isConnected && navFocusedEl.closest('#solitario-area')) {
                    e.preventDefault();
                    dispatchSyntheticPointerDown(navFocusedEl);
                    return;
                }
            }

            if (solitarioVisible && (e.key === 'r' || e.key === 'R')) {
                e.preventDefault();
                drawSolitarioStock();
                playSound();
                return;
            }

            // Sudoku: typing 1–9 fills the selected cell, Backspace/Delete erases.
            if (sudokuVisible && selectedCell && /^[1-9]$/.test(e.key)) {
                e.preventDefault();
                placeNumber(parseInt(e.key, 10));
                playSound();
                return;
            }
            if (sudokuVisible && selectedCell && (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0')) {
                e.preventDefault();
                eraseNumber();
                playSound();
                return;
            }

            if (!arrowNavEnabled) return;

            if (ARROW_KEYS.has(e.key) && arrowNavSingleStepEnabled) {
                if (e.repeat || pressedArrowKeys.has(e.key)) {
                    e.preventDefault();
                    return;
                }
                pressedArrowKeys.add(e.key);
            }

            const hasValidFocus = navFocusedEl && navFocusedEl.isConnected;

            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    if (!hasValidFocus) {
                        focusFirstNavigableElement();
                        break;
                    }
                    buildNavGrid();
                    if (navGrid.length === 0) break;
                    syncNavPositionWithFocusedElement();
                    const rightTarget = findDirectionalTarget(navFocusedEl, 'ArrowRight');
                    if (rightTarget && syncNavPositionWithElement(rightTarget)) {
                        applyNavFocus();
                    }
                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    if (!hasValidFocus) {
                        focusFirstNavigableElement();
                        break;
                    }
                    buildNavGrid();
                    if (navGrid.length === 0) break;
                    syncNavPositionWithFocusedElement();
                    const leftTarget = findDirectionalTarget(navFocusedEl, 'ArrowLeft');
                    if (leftTarget && syncNavPositionWithElement(leftTarget)) {
                        applyNavFocus();
                    }
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    if (!hasValidFocus) {
                        focusFirstNavigableElement();
                        break;
                    }
                    buildNavGrid();
                    if (navGrid.length === 0) break;
                    syncNavPositionWithFocusedElement();
                    const downTarget = findDirectionalTarget(navFocusedEl, 'ArrowDown');
                    if (downTarget && syncNavPositionWithElement(downTarget)) {
                        applyNavFocus();
                    }
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    if (!hasValidFocus) {
                        focusFirstNavigableElement();
                        break;
                    }
                    buildNavGrid();
                    if (navGrid.length === 0) break;
                    syncNavPositionWithFocusedElement();
                    const upTarget = findDirectionalTarget(navFocusedEl, 'ArrowUp');
                    if (upTarget && syncNavPositionWithElement(upTarget)) {
                        applyNavFocus();
                    }
                    break;

                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (isArrowFocusDwellActive()) break;
                    if (navFocusedEl) {
                        dispatchSyntheticPointerDown(navFocusedEl);
                    }
                    break;

                case 'Tab':
                    e.preventDefault();
                    if (!hasValidFocus) {
                        focusFirstNavigableElement();
                        break;
                    }
                    buildNavGrid();
                    if (navGrid.length === 0) break;
                    syncNavPositionWithFocusedElement();
                    if (e.shiftKey) {
                        const curSection = navGrid[navRow]?.section;
                        for (let i = navRow - 1; i >= 0; i--) {
                            if (navGrid[i].section !== curSection) {
                                navRow = i;
                                navCol = 0;
                                break;
                            }
                        }
                        if (navGrid[navRow]?.section === curSection) {
                            for (let i = navGrid.length - 1; i >= 0; i--) {
                                if (navGrid[i].section !== curSection) {
                                    navRow = i;
                                    navCol = 0;
                                    break;
                                }
                            }
                        }
                    } else {
                        const curSection = navGrid[navRow]?.section;
                        let found = false;
                        for (let i = navRow + 1; i < navGrid.length; i++) {
                            if (navGrid[i].section !== curSection) {
                                navRow = i;
                                navCol = 0;
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            navRow = 0;
                            navCol = 0;
                        }
                    }
                    applyNavFocus();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (ARROW_KEYS.has(e.key)) {
                pressedArrowKeys.delete(e.key);
            }
        });

        window.addEventListener('blur', () => {
            pressedArrowKeys.clear();
            cancelArrowFocusDwell();
        });
    }

    function getCurrentGameMode() {
        if (sudokuArea && sudokuArea.style.display !== 'none') return 'sudoku';
        if (solitarioArea && solitarioArea.style.display !== 'none') return 'solitario';
        return 'selector';
    }

    function summarizeSudokuForText() {
        if (!sudokuInitialized) return null;
        return {
            selectedCell,
            board: sudokuBoard.map((row) => row.map((value) => value || 0)),
            given: sudokuGiven,
            message: sudokuMessage.textContent || '',
        };
    }

    function summarizeSolitarioForText() {
        if (!solitarioInitialized) return null;
        return {
            moves: solitarioMoves,
            drawCount: solitarioDrawCount,
            stockCount: solitarioStock.length,
            wasteTop: cardCode(solitarioWaste[solitarioWaste.length - 1]),
            visibleWaste: getSolitarioWasteVisibleCards().map(cardCode),
            foundations: Object.fromEntries(
                SOLITARIO_SUITS.map((suit) => {
                    const pile = solitarioFoundations[suit.id] || [];
                    return [suit.short, {
                        count: pile.length,
                        top: cardCode(pile[pile.length - 1]),
                    }];
                })
            ),
            tableau: solitarioTableau.map((column, index) => {
                const hidden = column.filter((card) => !card.faceUp).length;
                const faceUp = column.filter((card) => card.faceUp).map(cardCode);
                return {
                    column: index + 1,
                    hidden,
                    faceUp,
                    top: faceUp[faceUp.length - 1] || '',
                };
            }),
            selected: solitarioSelected,
            helper: solitarioHelperText,
            message: solitarioMessageText,
        };
    }

    function renderGameToText() {
        const payload = {
            page: 'juegos',
            mode: getCurrentGameMode(),
            coordinateSystem: 'DOM order, visually top-left to bottom-right',
            sudoku: summarizeSudokuForText(),
            solitario: summarizeSolitarioForText(),
        };
        const text = JSON.stringify(payload);
        window.__lastGameText = text;
        return text;
    }

    window.render_game_to_text = renderGameToText;
    if (!window.advanceTime) {
        window.advanceTime = (ms) => new Promise((resolve) => {
            setTimeout(resolve, Math.max(0, Number(ms) || 0));
        });
    }

    function openMainAppMode(mode) {
        if (window.FullscreenHandoff) window.FullscreenHandoff.rememberIntent();
        window.location.href = `index.html?mode=${mode}`;
    }

    function requestGamesFullscreen() {
        if (!window.FullscreenHandoff) return;
        window.FullscreenHandoff.requestFullscreen();
    }

    // ========================================================
    // INITIALIZATION
    // ========================================================
    function initGamesPage() {
        loadStoredSettings();
        setupArrowNavigation();

        // Wire game selector card
        attachDwell(document.getElementById('select-sudoku'), showSudoku);
        attachDwell(document.getElementById('select-solitario'), showSolitario);

        // Wire Sudoku controls
        attachDwell(document.getElementById('sudoku-new'), () => newSudokuGame());
        attachDwell(document.getElementById('sudoku-check'), () => checkSudokuSolution());
        attachDwell(document.getElementById('sudoku-hint'), () => giveSudokuHint());
        attachDwell(document.getElementById('sudoku-back-to-menu'), showSelector);
        attachDwell(document.getElementById('sudoku-fullscreen'), requestGamesFullscreen);
        attachDwell(document.getElementById('sudoku-open-emojis'), () => openMainAppMode('emoji'));
        attachDwell(document.getElementById('sudoku-open-keyboard'), () => openMainAppMode('keyboard'));

        // Wire Solitario controls
        attachDwell(document.getElementById('solitario-new'), () => newSolitarioGame());
        attachDwell(document.getElementById('solitario-draw'), () => drawSolitarioStock());
        attachDwell(document.getElementById('solitario-draw-mode'), () => toggleSolitarioDrawMode());
        attachDwell(document.getElementById('solitario-undo'), () => undoSolitarioMove());
        attachDwell(document.getElementById('solitario-hint'), () => giveSolitarioHint());
        attachDwell(document.getElementById('solitario-back-to-menu'), showSelector);
        attachDwell(document.getElementById('solitario-fullscreen'), requestGamesFullscreen);
        attachDwell(document.getElementById('solitario-open-emojis'), () => openMainAppMode('emoji'));
        attachDwell(document.getElementById('solitario-open-keyboard'), () => openMainAppMode('keyboard'));

        // Wire back button
        attachDwell(document.getElementById('back-btn'), () => {
            if (window.FullscreenHandoff) window.FullscreenHandoff.rememberIntent();
            window.location.href = 'index.html';
        });

        window.addEventListener('resize', scheduleSolitarioTableauFit);

        if (window.FullscreenHandoff) window.FullscreenHandoff.init(attachDwell);
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGamesPage);
    } else {
        initGamesPage();
    }
})();
