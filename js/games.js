/**
 * games.js — Games page controller
 * Sudoku game with dwell-click support.
 */

(function () {
    'use strict';

    // ========================================================
    // Stored settings (shared with main app)
    // ========================================================
    let dwellTime = 800;
    let dwellEnabled = true;
    let soundEnabled = true;
    let arrowNavEnabled = false;
    let arrowFocusDwellEnabled = false;
    let arrowNavSingleStepEnabled = false;

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
            if (s.dwellEnabled != null) dwellEnabled = s.dwellEnabled;
            if (s.soundEnabled != null) soundEnabled = s.soundEnabled;
            if (s.arrowNavEnabled != null) arrowNavEnabled = s.arrowNavEnabled;
            if (s.arrowFocusDwellEnabled != null) arrowFocusDwellEnabled = s.arrowFocusDwellEnabled;
            if (s.arrowNavSingleStepEnabled != null) arrowNavSingleStepEnabled = s.arrowNavSingleStepEnabled;
        } catch (e) { /* ignore */ }
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
            startDwellVisual(btn);
            timer = setTimeout(() => {
                resetDwellVisual(btn);
                action();
                playSound();
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
            action();
            playSound();
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

    function showSelector() {
        gameSelector.style.display = '';
        sudokuArea.style.display = 'none';
        clearArrowNavFocus();
    }

    function showSudoku() {
        gameSelector.style.display = 'none';
        sudokuArea.style.display = '';
        if (!sudokuInitialized) initSudoku();
        clearArrowNavFocus();
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
        if (sudokuGiven[row][col]) return;

        // Remove previous selection
        sudokuBoardEl.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

        selectedCell = { row, col };
        const idx = row * 9 + col;
        sudokuBoardEl.children[idx].classList.add('selected');
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
        if (!selectedCell) return;
        placeNumber(0);
        const idx = selectedCell.row * 9 + selectedCell.col;
        sudokuBoardEl.children[idx].textContent = '';
        // Re-add dwell fill
        const cell = sudokuBoardEl.children[idx];
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
        return Boolean(el && el.isConnected && el.getClientRects().length > 0);
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
            if (!arrowNavEnabled) return;

            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

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

    // ========================================================
    // INITIALIZATION
    // ========================================================
    function initGamesPage() {
        loadStoredSettings();
        setupArrowNavigation();

        // Wire game selector card
        attachDwell(document.getElementById('select-sudoku'), showSudoku);

        // Wire Sudoku controls
        attachDwell(document.getElementById('sudoku-new'), () => newSudokuGame());
        attachDwell(document.getElementById('sudoku-check'), () => checkSudokuSolution());
        attachDwell(document.getElementById('sudoku-hint'), () => giveSudokuHint());
        attachDwell(document.getElementById('sudoku-back-to-menu'), showSelector);

        // Wire back button
        attachDwell(document.getElementById('back-btn'), () => {
            window.location.href = 'index.html';
        });
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGamesPage);
    } else {
        initGamesPage();
    }
})();
